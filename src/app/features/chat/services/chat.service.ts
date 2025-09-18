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
  takeUntil,
  catchError,
  tap,
  filter,
  take
} from 'rxjs/operators';
import { WebsocketService, type WebSocketMessage } from './websocket.service';
import { CreateRoomDto } from '../models/room.model';

export interface User {
  id: string;
  username: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  avatar?: string;
  lastSeen?: Date;
}

export interface Reaction {
  emoji: string;
  userId: string;
  username: string;
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
  reactions: Reaction[];
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
  isActive?: boolean;
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
  private websocketService: WebsocketService = inject(WebsocketService);
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
  public connectionStatus$: Observable<boolean> = this.websocketService.connectionStatus$;
  
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
  private currentUsername = 'Bran Don';
  private rooms: ChatRoom[] = [];

  constructor() {
    this.initializeWebSocketHandlers();
  }

  /**
   * Ensures WebSocket connection is established before proceeding
   * @returns Observable that completes when connected
   */
  ensureConnected(): Observable<boolean> {
    if (this.websocketService.isConnected()) {
      return of(true);
    }

    return this.websocketService.connectionStatus$.pipe(
      filter((connected: boolean) => connected === true),
      take(1),
      catchError((error: any) => {
        console.error('Failed to establish WebSocket connection:', error);
        return throwError(() => new Error('Failed to connect to chat server'));
      })
    );
  }

  private initializeDefaultRooms(): void {
    this.ensureConnected().subscribe(() => {
      const defaultRooms: ChatRoom[] = [
        {
          id: 'general',
          name: 'General',
          description: 'General discussion',
          type: 'public',
          members: [this.currentUserId],
          createdAt: new Date(),
          unreadCount: 0,
          isActive: true
        },
        {
          id: 'random',
          name: 'Random',
          description: 'Off-topic discussions',
          type: 'public',
          members: [this.currentUserId],
          createdAt: new Date(),
          unreadCount: 0,
          isActive: false
        }
      ];
      
      this.rooms = defaultRooms;
      this.stateSubject.next({
        ...this.stateSubject.value,
        rooms: this.rooms
      });
    });
    this.stateSubject.next({
      ...this.stateSubject.value,
      rooms: this.rooms
    });
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

  // Get all available rooms
  getRooms(): Observable<ChatRoom[]> {
    return this.state$.pipe(
      map(state => state.rooms),
      distinctUntilChanged()
    );
  }

  // Create a new chat room
  createRoom(roomData: CreateRoomDto): Observable<ChatRoom> {
    const newRoom: ChatRoom = {
      ...roomData,
      id: `room-${Date.now()}`,
      members: [...(roomData.members || []), this.currentUserId],
      createdAt: new Date(),
      unreadCount: 0,
      isActive: false
    };

    this.rooms = [...this.rooms, newRoom];
    
    this.stateSubject.next({
      ...this.stateSubject.value,
      rooms: this.rooms
    });

    return of(newRoom);
  }

  // Join a chat room
  joinRoom(roomId: string, username: string = this.currentUsername): Observable<ChatMessage> {
    if (!roomId) {
      return throwError(() => new Error('Room ID is required'));
    }

    // Send join message via WebSocket
    this.websocketService.sendMessage('JOIN_ROOM', {
      roomId,
      username: username || this.currentUsername,
      userId: this.currentUserId
    });
    
    // Update active room
    this.setActiveRoom(roomId);
    
    // Return a dummy message since we need to return Observable<ChatMessage>
    const dummyMessage: ChatMessage = {
      id: `sys-${Date.now()}`,
      content: `Joined room ${roomId}`,
      type: 'system',
      senderId: 'system',
      senderName: 'System',
      roomId,
      timestamp: new Date(),
      reactions: []
    };
    
    return of(dummyMessage);
  }

  // Send a message to the current room
  sendMessage(content: string, roomId: string): Observable<ChatMessage> {
    if (!content || !roomId) {
      return throwError(() => new Error('Content and roomId are required'));
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: 'text',
      senderId: this.currentUserId,
      senderName: this.currentUsername,
      roomId,
      timestamp: new Date(),
      reactions: []
    };

    // Add message to local state
    this.addMessageToRoom(message);
    
    // Send message via WebSocket
    this.websocketService.sendMessage('SEND_MESSAGE', message);

    return of(message);
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
      next: (message: WebSocketMessage) => this.handleIncomingMessage(message),
      error: (error: Error) => console.error('WebSocket error:', error)
    });
  }

  // Update typing status for a user in a room
  updateTypingStatus(userId: string, roomId: string, isTyping: boolean): void {
    if (!userId || !roomId) return;
    
    this.websocketService.sendMessage('TYPING_STATUS', {
      userId,
      roomId,
      isTyping
    });

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

  // Interface for message payload
  private parseMessagePayload(payload: any): ChatMessage {
    return {
      id: payload.id || `msg-${Date.now()}`,
      content: payload.content || '',
      type: (payload.type || 'text') as 'text' | 'image' | 'file' | 'system',
      senderId: payload.senderId || '',
      senderName: payload.senderName || 'Unknown User',
      roomId: payload.roomId || '',
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      reactions: Array.isArray(payload.reactions) ? payload.reactions : [],
      edited: payload.edited || false,
      editedAt: payload.editedAt ? new Date(payload.editedAt) : undefined,
      replyTo: payload.replyTo
    };
  }

  // Handle incoming WebSocket messages
  private handleIncomingMessage(message: WebSocketMessage): void {
    if (!message?.type) return;

    switch (message.type) {
      case 'NEW_MESSAGE':
        if (!message.payload) return;
        
        try {
          const chatMessage = this.parseMessagePayload(message.payload);
          this.addMessageToRoom(chatMessage);
        } catch (error) {
          console.error('Error processing incoming message:', error);
        }
        break;
        
      case 'USER_JOINED':
        // Handle user joined event
        if (message.payload) {
          this.handleUserJoined(message.payload);
        }
        break;
        
      case 'USER_LEFT':
        // Handle user left event
        if (message.payload) {
          this.handleUserLeft(message.payload);
        }
        break;
        
      case 'TYPING_STATUS':
        // Handle typing status update
        if (message.payload) {
          this.handleTypingStatusUpdate(message.payload);
        }
        break;
        
      case 'ERROR':
        console.error('WebSocket error:', message.payload);
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
