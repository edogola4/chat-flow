import { Injectable, OnDestroy } from '@angular/core';
import { 
  BehaviorSubject, 
  Observable, 
  of, 
  Subject, 
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
  take,
  first,
  switchMap
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
  private destroy$ = new Subject<void>();
  private stateSubject: BehaviorSubject<ChatState>;
  private currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
  private currentUsername = 'Bran Don';
  private rooms: ChatRoom[] = [];

  // Public observables with definite assignment assertion
  public state$!: Observable<ChatState>;
  public connectionStatus$!: Observable<boolean>;
  public activeRoom$!: Observable<ChatRoom | null>;
  public activeRoomMessages$!: Observable<ChatMessage[]>;
  public rooms$!: Observable<ChatRoom[]>;
  public onlineUsers$!: Observable<User[]>;
  public typingUsers$!: Observable<{ [roomId: string]: { [userId: string]: boolean } }>;

  constructor(private websocketService: WebsocketService) {
    // Initialize state
    this.stateSubject = new BehaviorSubject<ChatState>({
      rooms: [],
      activeRoomId: null,
      messages: {},
      users: [],
      typingUsers: {}
    });

    // Initialize observables
    this.initializeObservables();
    
    // Initialize WebSocket connection and handle authentication
    this.initializeWebSocketConnection();
    this.initializeWebSocketHandlers();
  }

  private initializeObservables(): void {
    // Initialize state observable
    this.state$ = this.stateSubject.asObservable();
    
    // Initialize connection status observable
    this.connectionStatus$ = this.websocketService.connectionStatus$;
    
    // Set up derived observables
    this.activeRoom$ = this.createActiveRoomObservable();
    this.activeRoomMessages$ = this.createActiveRoomMessagesObservable();
    this.rooms$ = this.createRoomsObservable();
    this.onlineUsers$ = this.createOnlineUsersObservable();
    this.typingUsers$ = this.createTypingUsersObservable();
  }

  private createActiveRoomObservable(): Observable<ChatRoom | null> {
    return this.state$.pipe(
      map(state => state.rooms.find(room => room.id === state.activeRoomId) || null),
      distinctUntilChanged((prev, curr) => {
        if (prev === null && curr === null) return true;
        if (prev === null || curr === null) return false;
        return prev.id === curr.id;
      }),
      shareReplay(1)
    );
  }

  private createActiveRoomMessagesObservable(): Observable<ChatMessage[]> {
    return this.state$.pipe(
      map(state => {
        const activeRoomId = state.activeRoomId;
        return activeRoomId ? state.messages[activeRoomId] || [] : [];
      }),
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) return false;
        return prev.every((msg, i) => msg.id === curr[i]?.id);
      }),
      shareReplay(1)
    );
  }

  private createRoomsObservable(): Observable<ChatRoom[]> {
    return this.state$.pipe(
      map(state => state.rooms),
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) return false;
        return prev.every((room, i) => room.id === curr[i]?.id);
      }),
      shareReplay(1)
    );
  }

  private createOnlineUsersObservable(): Observable<User[]> {
    return this.state$.pipe(
      map(state => state.users.filter(user => user.status === 'online')),
      distinctUntilChanged((prev, curr) => {
        if (prev.length !== curr.length) return false;
        return prev.every((user, i) => user.id === curr[i]?.id);
      }),
      shareReplay(1)
    );
  }

  private createTypingUsersObservable(): Observable<{ [roomId: string]: { [userId: string]: boolean } }> {
    return this.state$.pipe(
      map(state => state.typingUsers),
      distinctUntilChanged((prev, curr) => {
        const prevKeys = Object.keys(prev);
        const currKeys = Object.keys(curr);
        
        if (prevKeys.length !== currKeys.length) return false;
        
        return prevKeys.every(key => {
          const prevUsers = prev[key];
          const currUsers = curr[key];
          
          if (!prevUsers || !currUsers) return false;
          
          const prevUserIds = Object.keys(prevUsers);
          const currUserIds = Object.keys(currUsers);
          
          if (prevUserIds.length !== currUserIds.length) return false;
          
          return prevUserIds.every(userId => prevUsers[userId] === currUsers[userId]);
        });
      }),
      shareReplay(1)
    );
  }

  private initializeWebSocketConnection(): void {
    // Handle WebSocket connection status changes
    this.websocketService.connectionStatus$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isConnected => {
      if (isConnected) {
        console.log('[ChatService] WebSocket connected, authenticating...');
        // Authenticate when connected
        this.authenticate();
      } else {
        console.warn('[ChatService] WebSocket disconnected');
      }
    });
  }

  /**
   * Authenticate with the WebSocket server
   * @param username Optional username (uses current username if not provided)
   */
  authenticate(username?: string): Observable<boolean> {
    const authUsername = username || this.currentUsername;
    
    if (!authUsername) {
      return throwError(() => new Error('No username available for authentication'));
    }

    return this.websocketService.authState$.pipe(
      first(),
      map(authState => authState.isAuthenticated),
      catchError(error => {
        console.error('[ChatService] Authentication failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ensures WebSocket connection is established before proceeding
   * @returns Observable that completes when connected
   */
  ensureConnected(): Observable<boolean> {
    if (this.websocketService.isConnected) {
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

    // Ensure we're authenticated first
    return this.websocketService.authState$.pipe(
      first(),
      switchMap((authState: { isAuthenticated: boolean; error?: string }) => {
        if (!authState.isAuthenticated) {
          return throwError(() => new Error(authState.error || 'Not authenticated'));
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
      })
    );
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
    // Clean up any existing subscription
    this.destroy$.next();
    
    // Handle incoming messages
    this.websocketService.messages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message) => this.handleIncomingMessage(message),
      error: (error) => {
        console.error('WebSocket error in chat service:', error);
        // Handle reconnection or show error to user
      },
      complete: () => console.log('[ChatService] WebSocket subscription completed')
    });

    // Handle authentication state changes
    this.websocketService.authState$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (authState) => {
        if (authState.error) {
          console.error('[ChatService] Authentication error:', authState.error);
          // Handle authentication error (e.g., show error to user)
        } else if (authState.isAuthenticated) {
          console.log('[ChatService] Successfully authenticated');
          // Rejoin rooms if needed after reconnection
          this.rejoinRooms();
        }
      },
      error: (error) => console.error('[ChatService] Error in auth state:', error)
    });
  }

  private rejoinRooms(): void {
    const state = this.stateSubject.getValue();
    const activeRoomId = state.activeRoomId;
    
    // Rejoin the active room if there is one
    if (activeRoomId) {
      this.joinRoom(activeRoomId).subscribe({
        error: (error) => console.error(`[ChatService] Failed to rejoin room ${activeRoomId}:`, error)
      });
    }
  }

  // Update typing status for a user in a room
  updateTypingStatus(userId: string, roomId: string, isTyping: boolean): void {
    if (!userId || !roomId) return;
    
    // Send typing status update
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
