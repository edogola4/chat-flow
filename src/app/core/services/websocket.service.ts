import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { webSocket, WebSocketSubject, WebSocketSubjectConfig } from 'rxjs/webSocket';
import { Observable, Subject, EMPTY, throwError, of, timer, BehaviorSubject } from 'rxjs';
import { 
  catchError, 
  tap, 
  retryWhen, 
  switchMap, 
  takeUntil, 
  filter, 
  take,
  finalize,
  map,
  distinctUntilChanged
} from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { WebSocketMessage, WebSocketMessageType } from '../../shared/models/websocket-message.model';

// Fallback environment configuration
const environment = {
  webSocketUrl: 'ws://localhost:3001'
};

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private socket$: WebSocketSubject<any> | null = null;
  private connectionStatus$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();
  private reconnectAttempts = 0;
  private messageQueue: any[] = [];
  private isConnected = false;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL = 5000; // 5 seconds
  private readonly WS_ENDPOINT = environment.webSocketUrl;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket$ && !this.socket$.closed) {
      return;
    }

    console.log(`Connecting to WebSocket at ${this.WS_ENDPOINT}`);
    
    const config: WebSocketSubjectConfig<any> = {
      url: this.WS_ENDPOINT,
      closeObserver: {
        next: (event: CloseEvent) => {
          this.isConnected = false;
          this.connectionStatus$.next(false);
          this.handleDisconnection();
        }
      },
      openObserver: {
        next: (event: Event) => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionStatus$.next(true);
          this.processMessageQueue();
        }
      }
    };

    this.socket$ = this.createWebSocket(config);
    
    // Set up a ping interval to keep the connection alive
    this.setupPingInterval();
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
      this.isConnected = false;
      this.connectionStatus$.next(false);
    }
  }

  /**
   * Send a message to the WebSocket server
   * @param type Message type
   * @param payload Message payload
   * @returns Observable with the response
   */
  public sendMessage<T = any>(type: string, payload: any = {}): Observable<T> {
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };

    if (this.isConnected && this.socket$) {
      this.socket$.next(message);
      return this.onMessageType<T>(`${type}_RESPONSE`, message.requestId);
    } else {
      console.warn('WebSocket not connected. Queueing message:', message);
      this.messageQueue.push(message);
      return throwError(() => new Error('WebSocket not connected'));
    }
  }

  /**
   * Listen for messages of a specific type
   * @param messageType The message type to listen for
   * @returns Observable of messages of the specified type
   */
  public onMessageType<T = any>(messageType: string, requestId?: string): Observable<T> {
    if (!this.socket$) {
      return throwError(() => new Error('WebSocket not initialized'));
    }

    return this.socket$.pipe(
      filter((message: WebSocketMessage<T>) => 
        message.type === messageType && 
        (!requestId || message.requestId === requestId)
      ),
      map(message => message.payload),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get the current connection status
   * @returns Observable of the connection status
   */
  public getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable().pipe(
      distinctUntilChanged()
    );
  }

  /**
   * Clean up on service destruction
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  /**
   * Create a WebSocket connection with reconnection logic
   */
  private createWebSocket(config: WebSocketSubjectConfig<any>): WebSocketSubject<any> {
    return webSocket({
      ...config,
      serializer: (msg) => JSON.stringify(msg),
      deserializer: (e: MessageEvent) => {
        try {
          return JSON.parse(e.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, e.data);
          return { type: 'ERROR', payload: { error: 'Invalid message format' } };
        }
      },
      openObserver: {
        next: (event: Event) => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.connectionStatus$.next(true);
          this.processMessageQueue();
        }
      },
      closeObserver: {
        next: (e: CloseEvent) => {
          console.log('WebSocket connection closed:', e.reason);
          this.isConnected = false;
          this.connectionStatus$.next(false);
          this.handleDisconnection();
        }
      }
    });
  }

  /**
   * Handle disconnection and attempt to reconnect
   */
  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      timer(delay).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.reconnectAttempts++;
        this.connect();
      });
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Process any queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected && this.socket$) {
      const message = this.messageQueue.shift();
      this.socket$.next(message);
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Set up a ping interval to keep the connection alive
   */
  private setupPingInterval(): void {
    const pingInterval = 30000; // 30 seconds
    
    // Send a ping every 30 seconds
    const interval = setInterval(() => {
      if (this.isConnected && this.socket$) {
        this.socket$.next({
          type: 'PING',
          timestamp: new Date().toISOString()
        });
      }
    }, pingInterval);

    // Clear interval on destroy
    this.destroy$.subscribe(() => {
      clearInterval(interval);
    });
  }
}
