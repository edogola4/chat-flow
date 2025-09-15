import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebsocketService } from '../../../core/services/websocket.service';

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  roomId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private connectionStatus$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(private websocketService: WebsocketService) {
    this.setupWebSocketListeners();
  }

  /**
   * Send a chat message
   * @param content Message content
   * @param sender Sender's name
   * @param roomId Optional room ID for group chats
   */
  sendMessage(content: string, sender: string, roomId?: string): void {
    const message = {
      content,
      sender,
      roomId,
      timestamp: new Date().toISOString()
    };

    this.websocketService.sendMessage('CHAT_MESSAGE', message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Message sent successfully', response);
        },
        error: (error) => {
          console.error('Failed to send message', error);
        }
      });
  }

  /**
   * Get messages observable
   */
  getMessages(): Observable<ChatMessage[]> {
    return this.messages$.asObservable();
  }

  /**
   * Get connection status observable
   */
  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Join a chat room
   * @param roomId Room ID to join
   * @param username User's username
   */
  joinRoom(roomId: string, username: string): void {
    this.websocketService.sendMessage('JOIN_ROOM', { roomId, username })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Joined room ${roomId}`, response);
        },
        error: (error) => {
          console.error(`Failed to join room ${roomId}`, error);
        }
      });
  }

  /**
   * Leave a chat room
   * @param roomId Room ID to leave
   * @param username User's username
   */
  leaveRoom(roomId: string, username: string): void {
    this.websocketService.sendMessage('LEAVE_ROOM', { roomId, username })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(`Left room ${roomId}`, response);
        },
        error: (error) => {
          console.error(`Failed to leave room ${roomId}`, error);
        }
      });
  }

  private setupWebSocketListeners(): void {
    // Listen for new messages
    this.websocketService.onMessageType('NEW_MESSAGE')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        const newMessage: ChatMessage = {
          id: message.id || Date.now().toString(),
          content: message.content,
          sender: message.sender,
          timestamp: new Date(message.timestamp),
          roomId: message.roomId
        };
        
        // Add the new message to our messages array
        this.messages$.next([...this.messages$.value, newMessage]);
      });

    // Listen for connection status changes
    this.websocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isConnected: boolean) => {
        this.connectionStatus$.next(isConnected);
        
        if (isConnected) {
          console.log('Connected to WebSocket server');
        } else {
          console.log('Disconnected from WebSocket server');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.messages$.complete();
    this.connectionStatus$.complete();
  }
}
