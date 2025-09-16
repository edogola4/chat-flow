import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import { WebsocketService, WebSocketMessage } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private websocketService = inject(WebsocketService);
  private authService = inject(AuthService);
  private destroy$ = new BehaviorSubject<void>(undefined);
  
  private currentRoomId: string | null = null;
  private messages$ = new BehaviorSubject<any[]>([]);
  
  constructor() {
    // Authenticate WebSocket when user logs in
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$),
      filter(user => !!user)
    ).subscribe(user => {
      if (user) {
        this.authenticateWebSocket(user);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Authenticate with WebSocket server using current user
   */
  private authenticateWebSocket(user: any): void {
    this.websocketService.authenticate(
      user.id,
      user.username,
      user.email,
      user.avatar
    ).subscribe({
      next: (success) => {
        if (success) {
          console.log('WebSocket authenticated successfully');
          // Join default room if not already joined
          if (!this.currentRoomId) {
            this.joinRoom('general');
          }
        }
      },
      error: (error) => {
        console.error('WebSocket authentication failed:', error);
      }
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string): void {
    if (this.currentRoomId === roomId) {
      return;
    }

    // Leave current room if any
    if (this.currentRoomId) {
      this.leaveRoom(this.currentRoomId);
    }

    this.currentRoomId = roomId;
    
    this.websocketService.sendMessage({
      type: 'JOIN_ROOM',
      data: { roomId }
    });
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    if (this.currentRoomId === roomId) {
      this.websocketService.sendMessage({
        type: 'LEAVE_ROOM',
        data: { roomId }
      });
      this.currentRoomId = null;
    }
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string, roomId: string = this.currentRoomId!): void {
    if (!roomId) {
      console.error('No room selected');
      return;
    }

    const message = {
      id: `msg-${Date.now()}`,
      content,
      type: 'text',
      roomId,
      timestamp: new Date().toISOString(),
      reactions: []
    };

    this.websocketService.sendMessage({
      type: 'SEND_MESSAGE',
      data: message
    });
  }

  /**
   * Get messages observable for the current room
   */
  getMessages(): Observable<any[]> {
    return this.messages$.asObservable();
  }

  /**
   * React to a message
   */
  reactToMessage(messageId: string, reaction: string): void {
    this.websocketService.sendMessage({
      type: 'REACT_TO_MESSAGE',
      data: {
        messageId,
        reaction
      }
    });
  }

  /**
   * Delete a message
   */
  deleteMessage(messageId: string): void {
    this.websocketService.sendMessage({
      type: 'DELETE_MESSAGE',
      data: { messageId }
    });
  }

  /**
   * Get the current room ID
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }
}
