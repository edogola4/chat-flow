import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, merge, of } from 'rxjs';
import { filter, map, tap, shareReplay, takeUntil, finalize, catchError, first, distinctUntilChanged } from 'rxjs/operators';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  /** Subject for WebSocket messages */
  public readonly messageSubject = new Subject<WebSocketMessage>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: any = null;

  // Public observable for connection status
  public connectionStatus$ = this.connectionStatus.asObservable();
  
  // Public observable for incoming messages
  public messages$ = this.messageSubject.asObservable();

  constructor() {
    this.connect();
  }

  // Connect to WebSocket server
  private connect(): void {
    try {
      // Close existing connection if any
      this.disconnect();

      // Connect to WebSocket server on port 3001
      this.socket = new WebSocket('ws://localhost:3001');

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.connectionStatus.next(true);
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      // Add error handler
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus.next(false);
        this.handleReconnect();
      };

      // Add close handler
      this.socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason || 'No reason provided'}`);
        this.connectionStatus.next(false);
        this.handleReconnect();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageSubject.next(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.connectionStatus.next(false);
      this.handleReconnect();
    }
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Send a message to the WebSocket server and optionally wait for a response
   * @param type The message type
   * @param payload The message payload
   * @param waitForResponse If true, returns an Observable that completes when a response is received
   * @returns Observable that completes when the message is sent (or when response is received if waitForResponse is true), or errors if the WebSocket is not connected
   */
  public sendMessage<T = any>(type: string, payload: any, waitForResponse: boolean = false): Observable<T> | void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const error = new Error('WebSocket is not connected');
      if (waitForResponse) {
        return new Observable(subscriber => subscriber.error(error));
      }
      console.warn('WebSocket is not connected. Message not sent:', type, payload);
      return;
    }

    try {
      const message = { type, payload };
      
      const messageString = JSON.stringify(message);
      
      console.log('Sending WebSocket message:', messageString);
      this.socket.send(messageString);
      
      if (waitForResponse) {
        return new Observable<T>(subscriber => {
          const subscription = this.messageSubject.pipe(
            filter((msg: any) => 
              msg && (msg.type === `${type}_RESPONSE` || msg.type === 'ERROR')
            ),
            takeUntil(fromEvent(this.socket as WebSocket, 'close')),
            first()
          ).subscribe({
            next: (response: any) => {
              if (response.type === 'ERROR') {
                subscriber.error(response.payload);
              } else {
                subscriber.next(response.payload as T);
                subscriber.complete();
              }
            },
            error: (error) => subscriber.error(error)
          });

          return () => subscription.unsubscribe();
        });
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      if (waitForResponse) {
        return new Observable(subscriber => subscriber.error(error));
      }
    }
  }

  // Listen for messages of a specific type
  public onMessage<T = any>(type?: string): Observable<T> {
    return this.messageSubject.pipe(
      filter((message: WebSocketMessage) => !type || message.type === type),
      map((message: WebSocketMessage) => message.payload as T)
    );
  }
  
  // Listen for reconnection events
  public onReconnect(): Observable<void> {
    return this.connectionStatus.pipe(
      distinctUntilChanged(),
      filter(connected => connected === true),
      map(() => undefined)
    );
  }

  // Close the WebSocket connection
  public close(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
  
  // Alias for backward compatibility
  public send = this.sendMessage;

  // Disconnect from WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}