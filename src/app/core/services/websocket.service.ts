import { Injectable, OnDestroy } from '@angular/core';
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { Observable, BehaviorSubject, Subject, of, timer, throwError, EMPTY } from 'rxjs';
import { 
  catchError, 
  tap, 
  retryWhen, 
  delay, 
  take, 
  filter, 
  map, 
  takeUntil,
  timeout
} from 'rxjs/operators';

export const WS_ENDPOINT = 'ws://localhost:3001';
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface WebSocketMessage {
  type: string;
  data: any;
  requestId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private reconnectAttempts = 0;
  private messageQueue: WebSocketMessage[] = [];
  private destroy$ = new Subject<void>();
  private messageSubject = new Subject<WebSocketMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  
  // Public observables
  public readonly connectionStatus$ = this.connectionStatusSubject.asObservable();
  public readonly messages$ = this.messageSubject.asObservable();
  
  // Connection configuration
  private config: WebSocketSubjectConfig<WebSocketMessage> = {
    url: WS_ENDPOINT,
    closeObserver: {
      next: () => {
        this.connectionStatusSubject.next(false);
        this.attemptReconnection();
      }
    },
    openObserver: {
      next: () => {
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        this.processMessageQueue();
      }
    }
  };

  private _isAuthenticated = false;
  private currentUser: { userId: string; username: string } | null = null;

  /**
   * Check if the WebSocket connection is authenticated
   */
  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }
  
  // Setter for internal use only
  private set isAuthenticated(value: boolean) {
    this._isAuthenticated = value;
  }

  constructor() {
    this.connect();
  }

  /**
   * Authenticate the WebSocket connection with user credentials
   */
  authenticate(userId: string, username: string, email?: string, avatar?: string): Observable<boolean> {
    if (!this.socket$ || this.socket$.closed) {
      return throwError(() => new Error('WebSocket is not connected'));
    }

    this.currentUser = { userId, username };
    
    return this.sendWithResponse<{ success: boolean }>({
      type: 'AUTHENTICATE',
      data: {
        userId,
        username,
        email,
        avatar
      }
    }, 'AUTH_SUCCESS').pipe(
      map(response => {
        this.isAuthenticated = response.success;
        return this.isAuthenticated;
      }),
      catchError(error => {
        console.error('Authentication failed:', error);
        this.isAuthenticated = false;
        return of(false);
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next(undefined);
    this.destroy$.complete();
    this.disconnect();
  }

  private connect(): void {
    if (this.socket$ && !this.socket$.closed) {
      return;
    }

    try {
      this.socket$ = webSocket<WebSocketMessage>(this.config);
      
      this.socket$.pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('WebSocket error:', error);
          this.connectionStatusSubject.next(false);
          return throwError(() => error);
        })
      ).subscribe({
        next: (message) => {
          // Handle authentication success message
          if (message.type === 'AUTH_SUCCESS') {
            this.isAuthenticated = true;
            this.messageSubject.next(message);
          } else {
            this.messageSubject.next(message);
          }
        },
        error: (error) => {
          console.error('WebSocket subscription error:', error);
          this.connectionStatusSubject.next(false);
          this.isAuthenticated = false;
        },
        complete: () => {
          console.log('WebSocket connection closed');
          this.connectionStatusSubject.next(false);
          this.isAuthenticated = false;
        }
      });
      
      // Re-authenticate if we have a current user
      if (this.currentUser && !this.isAuthenticated) {
        this.authenticate(
          this.currentUser.userId,
          this.currentUser.username
        ).subscribe(success => {
          if (success) {
            console.log('Re-authenticated WebSocket connection');
          }
        });
      }
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnection();
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${backoffTime}ms`);
    
    timer(backoffTime).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => this.connect(),
      error: (err) => console.error('Error during reconnection attempt:', err)
    });
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionStatusSubject.value) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).subscribe({
          error: (err) => console.error('Error sending queued message:', err)
        });
      }
    }
  }

  private disconnect(): void {
    if (this.socket$) {
      try {
        this.socket$.complete();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.socket$ = null;
    }
    this.connectionStatusSubject.next(false);
  }

  sendMessage(message: WebSocketMessage, queueIfOffline = true): Observable<boolean> {
    if (!this.socket$ || this.socket$.closed) {
      if (queueIfOffline) {
        this.messageQueue.push(message);
      }
      return of(false);
    }

    try {
      this.socket$.next(message);
      return of(true);
    } catch (error) {
      console.error('Error sending message:', error);
      if (queueIfOffline) {
        this.messageQueue.push(message);
      }
      this.connectionStatusSubject.next(false);
      return of(false);
    }
  }

  sendWithResponse<T = any>(
    message: WebSocketMessage,
    responseType: string,
    timeoutMs = 10000
  ): Observable<T> {
    const requestId = this.generateRequestId();
    const request: WebSocketMessage = { 
      ...message,
      data: {
        ...(message.data || {}),
        requestId
      }
    };

    // Create a typed response observable
    const response$ = new Observable<T>(subscriber => {
      const subscription = this.messages$.pipe(
        filter((msg: WebSocketMessage) => {
          if (typeof msg.data === 'object' && msg.data !== null) {
            return msg.type === responseType && (msg.data as any).requestId === requestId;
          }
          return false;
        }),
        map((msg: WebSocketMessage) => {
          // Return the entire message data as type T
          return msg.data as unknown as T;
        }),
        take(1),
        timeout<T>({
          each: timeoutMs,
          with: () => throwError(() => new Error(`Timeout waiting for ${responseType} response`))
        } as any)
      ).subscribe({
        next: (value: T) => subscriber.next(value),
        error: (err: any) => subscriber.error(err),
        complete: () => subscriber.complete()
      });

      // Cleanup subscription on unsubscribe
      return () => subscription.unsubscribe();
    });

    // Send the request
    this.sendMessage(request).subscribe({
      error: (err) => {
        console.error('Failed to send request:', err);
      }
    });

    return response$;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  get isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  get connectionStatus(): Observable<boolean> {
    return this.connectionStatus$;
  }

  // Alias for backward compatibility
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$;
  }

  // Alias for messages$
  onMessage(): Observable<WebSocketMessage> {
    return this.messages$;
  }

  // Helper method to send simple string messages
  sendSimpleMessage(type: string, data: any = {}): Observable<boolean> {
    return this.sendMessage({
      type,
      data
    });
  }

  onMessageType(type: string): Observable<WebSocketMessage> {
    return this.messages$.pipe(
      tap((msg: WebSocketMessage) => console.log('Received message:', msg)),
      filter((message: WebSocketMessage) => message.type === type)
    );
  }

  closeConnection(): void {
    this.disconnect();
  }

  reconnect(): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.complete();
    }
    this.connect();
  }
}
