import { Injectable, OnDestroy, inject } from '@angular/core';
import { 
  BehaviorSubject, 
  Observable, 
  Subject, 
  of, 
  throwError
} from 'rxjs';
import { 
  map, 
  distinctUntilChanged, 
  shareReplay,
  filter,
  takeUntil
} from 'rxjs/operators';
import { WebsocketService, WebSocketMessage } from '../../../core/services/websocket.service';

export interface User {
  id: string;
  username: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  lastSeen?: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  senderId: string;
  senderName: string;
  roomId: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  reactions: { emoji: string; userId: string; username: string }[];
  emoji?: string;
  userId: string;
  username: string;
  replyTo?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  createdAt: Date;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: { [roomId: string]: ChatMessage[] };
  users: User[];
  typingUsers: { [roomId: string]: { [userId: string]: boolean } };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private websocketService = inject(WebsocketService);
  private destroy$ = new Subject<void>();
  
  private stateSubject = new BehaviorSubject<ChatState>({
    rooms: [],
    activeRoomId: null,
    messages: {},
    users: [],
    typingUsers: {}
  });

  // Public observables
  public state$ = this.stateSubject.asObservable();
  public connectionStatus$ = this.websocketService.connectionStatus$;
  
  public activeRoom$ = this.state$.pipe(
    map(state => state.rooms.find(room => room.id === state.activeRoomId) || null),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public activeRoomMessages$ = this.state$.pipe(
    map(state => {
      const activeRoomId = state.activeRoomId;
      return activeRoomId ? state.messages[activeRoomId] || [] : [];
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public rooms$ = this.state$.pipe(
    map(state => state.rooms),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public onlineUsers$ = this.state$.pipe(
    map(state => state.users.filter(user => user.status === 'online')),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public typingUsers$ = this.state$.pipe(
    map(state => state.typingUsers),
    distinctUntilChanged(),
    shareReplay(1)
  );

  private currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
  private currentUsername = 'User' + Math.random().toString(36).substr(2, 5);

  constructor() {
    this.initializeWebSocketHandlers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // No need to manually disconnect as the WebSocket service manages its own connection
  }

  // Get messages for a specific room
  getMessagesForRoom(roomId: string): Observable<ChatMessage[]> {
    return this.state$.pipe(
      map(state => state.messages[roomId] || []),
      distinctUntilChanged()
    );
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getCurrentUsername(): string {
    return this.currentUsername;
  }

  // Join a chat room
  joinRoom(roomId: string, username?: string): Observable<ChatMessage> {
    if (username) {
      this.currentUsername = username;
    }
    
    // Notify server that we're joining a room
    const joinMessage = {
      type: 'JOIN_ROOM',
      data: {
        roomId, 
        username: this.currentUsername 
      }
    } as const;
    
    this.websocketService.sendMessage(joinMessage);
    
    // Update local state
    this.stateSubject.next({
      ...this.stateSubject.value,
      activeRoomId: roomId
    });
    
    // Return a dummy message since we need to return Observable<ChatMessage>
    const dummyMessage: ChatMessage = {
      id: `sys-${Date.now()}`,
      content: `Joined room ${roomId}`,
      type: 'system',
      senderId: 'system',
      senderName: 'System',
      roomId,
      timestamp: new Date(),
      reactions: [],
      userId: 'system',
      username: 'System'
    };
    
    return of(dummyMessage);
  }

  // Send a message to the current room
  sendMessage(content: string, roomId: string): Observable<ChatMessage> {
    if (!content || !roomId) {
      return throwError(() => new Error('Message content and room ID are required'));
    }

    const message = {
      type: 'SEND_MESSAGE',
      data: {
        content,
        roomId,
        senderId: this.currentUserId,
        senderName: this.currentUsername,
        timestamp: new Date()
      }
    } as const;

    // Create a new message object
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content,
      type: 'text',
      senderId: this.currentUserId,
      senderName: this.currentUsername,
      roomId,
      timestamp: new Date(),
      reactions: [],
      userId: this.currentUserId,
      username: this.currentUsername
    };

    // Add the message to the local state immediately for optimistic UI update
    this.addMessageToRoom(newMessage);

    // Send the message via WebSocket and return an observable that completes with the new message
    this.websocketService.sendMessage(message);
    return of(newMessage);
  }

  // Set the active room
  setActiveRoom(roomId: string): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      activeRoomId: roomId
    });
  }

  // Update the active room (alias for setActiveRoom)
  updateActiveRoom(roomId: string): void {
    this.setActiveRoom(roomId);
  }

  // Add a new message to a room
  private addMessageToRoom(message: ChatMessage): void {
    const state = this.stateSubject.value;
    const { roomId } = message;
    
    if (!roomId) return;
    
    // Get current messages for the room
    const currentMessages = state.messages[roomId] || [];
    
    // Check if message already exists (by ID or timestamp)
    const messageExists = currentMessages.some(m => 
      m.id === message.id || 
      (m.timestamp && message.timestamp && m.timestamp.getTime() === message.timestamp.getTime())
    );
    
    if (messageExists) return;
    
    // Add the new message and sort by timestamp
    const updatedMessages = [...currentMessages, message]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Update the state
    this.stateSubject.next({
      ...state,
      messages: {
        ...state.messages,
        [roomId]: updatedMessages
      },
      // Update last message in the room
      rooms: state.rooms.map(room => 
        room.id === roomId 
          ? { ...room, lastMessage: message }
          : room
      )
    });
    
    // If this is a message in the active room, mark as read
    if (roomId === state.activeRoomId) {
      this.markRoomAsRead(roomId);
    }
  }
  
  // Mark all messages in a room as read
  private markRoomAsRead(roomId: string): void {
    const state = this.stateSubject.getValue();
    
    this.stateSubject.next({
      ...state,
      rooms: state.rooms.map(room => 
        room.id === roomId 
          ? { ...room, unreadCount: 0 }
          : room
      )
    });
  }

  // Initialize WebSocket event handlers
  private initializeWebSocketHandlers(): void {
    this.websocketService.messages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message) => this.handleIncomingMessage(message as any),
      error: (error: any) => console.error('WebSocket error:', error)
    });
  }

  // Update typing status for a user in a room
  updateTypingStatus(userId: string, roomId: string, isTyping: boolean): void {
    const state = this.stateSubject.getValue();
    
    // Update typing users state
    const typingUsers = {
      ...state.typingUsers,
      [roomId]: {
        ...state.typingUsers[roomId],
        [userId]: isTyping
      }
    };

    // Notify other users about typing status
    this.websocketService.sendMessage('TYPING_STATUS', {
      userId,
      roomId,
      isTyping
    });

    // Update the state
    this.stateSubject.next({
      ...state,
      typingUsers
    });
  }

  // Handle incoming WebSocket messages
  private handleIncomingMessage(message: { type: string; data: any }): void {
    if (!message || !message.type) return;

    switch (message.type) {
      case 'NEW_MESSAGE':
        const chatMessage: ChatMessage = {
          id: message.data.id || `msg-${Date.now()}`,
          content: message.data.content,
          type: message.data.type || 'text',
          senderId: message.data.senderId,
          senderName: message.data.senderName,
          roomId: message.data.roomId,
          timestamp: new Date(message.data.timestamp || Date.now()),
          reactions: message.data.reactions || [],
          userId: message.data.userId || message.data.senderId,
          username: message.data.username || message.data.senderName
        };
        this.addMessageToRoom(chatMessage);
        break;
        
      case 'USER_JOINED':
        // Handle user joined event
        this.handleUserJoined(message.data);
        break;
        
      case 'USER_LEFT':
        // Handle user left event
        this.handleUserLeft(message.data);
        break;
        
      case 'TYPING_STATUS':
        // Handle typing status update
        this.handleTypingStatusUpdate(message.data);
        break;
        
      case 'ERROR':
        console.error('WebSocket error:', message.data);
        break;
    }
  }

  private handleUserJoined(payload: any): void {
    const { userId, username, roomId } = payload;
    const state = this.stateSubject.getValue();
    
    // Add user to the room if not already present
    const room = state.rooms.find(r => r.id === roomId);
    if (room && !room.members.includes(userId)) {
      room.members.push(userId);
      
      this.stateSubject.next({
        ...state,
        rooms: [...state.rooms]
      });
    }
  }

  private handleUserLeft(payload: any): void {
    const { userId, roomId } = payload;
    const state = this.stateSubject.getValue();
    
    // Remove user from the room
    const updatedRooms = state.rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          members: room.members.filter(id => id !== userId)
        };
      }
      return room;
    });

    this.stateSubject.next({
      ...state,
      rooms: updatedRooms
    });
  }

  private handleTypingStatusUpdate(payload: any): void {
    const { userId, roomId, isTyping } = payload;
    const state = this.stateSubject.getValue();
    
    // Update typing users state
    const typingUsers = {
      ...state.typingUsers,
      [roomId]: {
        ...state.typingUsers[roomId],
        [userId]: isTyping
      }
    };

    this.stateSubject.next({
      ...state,
      typingUsers
    });
  }
}
