import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { catchError, tap, retryWhen, delay, take } from 'rxjs/operators';

export interface WebSocketMessage {
  type: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private connectionStatus$ = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageSubject = new Subject<WebSocketMessage>();
  private url = 'ws://localhost:3001';

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket$ && !this.socket$.closed) {
      return;
    }

    this.socket$ = webSocket<WebSocketMessage>({
      url: this.url,
      openObserver: {
        next: () => {
          this.connectionStatus$.next(true);
          console.log('WebSocket connected');
        }
      },
      closeObserver: {
        next: () => {
          this.connectionStatus$.next(false);
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        }
      }
    });

    this.socket$.pipe(
      tap({
        next: (message) => this.messageSubject.next(message),
        error: (error) => console.error('WebSocket error:', error)
      })
    ).subscribe();
  }

  private attemptReconnect(): void {
    if (!this.socket$) return;
    
    this.socket$.pipe(
      retryWhen(errors => 
        errors.pipe(
          tap(error => console.log('Retrying to connect...', error)),
          delay(this.reconnectDelay),
          take(this.reconnectAttempts)
        )
      )
    ).subscribe({
      error: (err) => console.error('Failed to reconnect:', err)
    });
  }

  sendMessage(type: string, data: any): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      if (!this.connectionStatus$.value || !this.socket$) {
        subscriber.error(new Error('WebSocket is not connected'));
        return;
      }

      try {
        this.socket$.next({ type, data });
        subscriber.next(true);
        subscriber.complete();
      } catch (error) {
        console.error('Error sending message:', error);
        subscriber.error(error);
      }
    });
  }

  onMessage(): Observable<WebSocketMessage> {
    return this.messageSubject.asObservable();
  }

  onMessageType(type: string): Observable<WebSocketMessage> {
    return this.messageSubject.pipe(
      tap({
        next: (message) => {
          if (message.type !== type && type !== '*') {
            throw new Error(`Message type mismatch: expected ${type}, got ${message.type}`);
          }
        },
        error: (err) => console.error('Error in message filter:', err)
      })
    );
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }

  closeConnection(): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.complete();
      this.connectionStatus$.next(false);
      this.socket$ = null;
    }
  }

  reconnect(): void {
    this.closeConnection();
    this.connect();
  }
}
