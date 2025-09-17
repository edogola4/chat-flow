import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { 
  BehaviorSubject, 
  Observable, 
  Subject, 
  fromEvent, 
  merge, 
  of, 
  Subscriber,
  Observer,
  PartialObserver,
  Subscription,
  throwError
} from 'rxjs';
import { 
  filter, 
  map, 
  tap, 
  shareReplay, 
  takeUntil, 
  finalize, 
  catchError, 
  first, 
  distinctUntilChanged,
  retryWhen,
  delay,
  switchMap
} from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

// WebSocket configuration
const WS_CONFIG = {
  wsUrl: environment.wsUrl,
  reconnectAttempts: environment.reconnectAttempts,
  reconnectDelay: environment.reconnectDelay,
  heartbeatInterval: environment.heartbeatInterval,
  maxMessageSize: 10000
};

// Message types for type safety
export enum MessageType {
  // Client to server
  AUTHENTICATE = 'AUTHENTICATE',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  SEND_MESSAGE = 'SEND_MESSAGE',
  TYPING_STATUS = 'TYPING_STATUS',
  
  // Server to client
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  AUTH_ERROR = 'AUTH_ERROR',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  NEW_MESSAGE = 'NEW_MESSAGE',
  TYPING_UPDATE = 'TYPING_UPDATE',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  ERROR = 'ERROR',
  INITIAL_STATE = 'INITIAL_STATE'
}

export interface WebSocketMessage<T = unknown> {
  type: MessageType | string;
  payload: T;
  requestId?: string;
  id?: string; // Added id to match usage in the code
  timestamp?: number;
}

interface QueuedMessage<T = unknown, R = unknown> {
  type: string;
  payload: T;
  requestId: string;
  resolve: (value: R) => void;
  reject: (reason?: unknown) => void;
  timestamp: number;
}

interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  maxMessageSize?: number;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: environment.wsUrl || `ws://${window.location.hostname}:3001`,
  reconnectAttempts: 5,
  reconnectDelay: 3000,
  heartbeatInterval: 25000, // 25 seconds
  maxMessageSize: 1024 * 1024 // 1MB
};

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<WebSocketMessage<unknown>>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private reconnectDelay = 3000;
  private messageQueue: QueuedMessage[] = [];
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private readonly destroy$ = new Subject<void>();
  private config: WebSocketConfig;
  private heartbeatIntervalId: any = null;
  private lastHeartbeat = 0;
  private pendingRequests = new Map<string, QueuedMessage>();
  private authToken: string | null = null;

  // Public observables
  public readonly connectionStatus$ = this.connectionStatus.asObservable();
  public readonly messages$ = this.messageSubject.asObservable();
  public readonly isConnected$ = this.connectionStatus.asObservable().pipe(distinctUntilChanged());

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.config = { ...DEFAULT_CONFIG };
    
    if (isPlatformBrowser(this.platformId)) {
      this.connect();
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private connect(): void {
    if (this.isConnecting || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isConnecting = true;
    this.disconnect();

    try {
      console.log(`[WebSocket] Connecting to ${this.config.url}`);
      this.socket = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.connectionStatus.next(false);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => this.handleOpen();
    this.socket.onclose = (event) => this.handleClose(event);
    this.socket.onerror = (error) => this.handleError(error);
    this.socket.onmessage = (event) => this.handleMessage(event);
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionStatus.next(true);
    this.startHeartbeat();
    this.processMessageQueue();
    this.authenticate();
  }
  authenticate() {
    throw new Error('Method not implemented.');
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason || 'No reason provided'}`);
    this.cleanup();
    this.connectionStatus.next(false);
    this.scheduleReconnect();
  }
  private cleanup(): void {
    this.stopHeartbeat();
    this.messageQueue = [];
    this.pendingRequests.clear();
    this.isConnecting = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    console.error('[WebSocket] Error:', error);
    // The onclose handler will be called after an error
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      this.lastHeartbeat = Date.now();
      
      // Handle heartbeat responses
      if (message.type === 'pong') {
        return;
      }

      // Handle request/response pattern
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const pendingRequest = this.pendingRequests.get(message.requestId);
        if (pendingRequest) {
          this.pendingRequests.delete(message.requestId);
          if (message.type === MessageType.ERROR) {
            pendingRequest.reject(message.payload);
          } else {
            pendingRequest.resolve(message.payload);
          }
        }
      }

      // Emit the message to subscribers
      this.messageSubject.next(message);
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Start the heartbeat mechanism to keep the connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }
      
      // If we haven't received a pong in 2 intervals, force reconnect
      if (Date.now() - this.lastHeartbeat > this.config.heartbeatInterval! * 2) {
        console.warn('[WebSocket] No heartbeat response, reconnecting...');
        this.scheduleReconnect();
        return;
      }
      
      // Send ping
      try {
        this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch (error) {
        console.error('[WebSocket] Error sending heartbeat:', error);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop the heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Process any queued messages
   */
  private processMessageQueue(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Process messages in the queue
    const processedIndices: number[] = [];
    
    this.messageQueue.forEach((queuedMsg, index) => {
      try {
        const message: WebSocketMessage<unknown> = {
          type: queuedMsg.type,
          payload: queuedMsg.payload,
          requestId: queuedMsg.requestId,
          timestamp: Date.now()
        };

        this.socket?.send(JSON.stringify(message));
        processedIndices.unshift(index);
      } catch (error) {
        console.error('Error sending queued message:', error);
        queuedMsg.reject(error);
      }
    });

    // Remove processed messages (from end to beginning to avoid index shifting issues)
    processedIndices.forEach(index => {
      this.messageQueue.splice(index, 1);
    });
  }

  /**
   * Send a raw message to the WebSocket
   */
  private sendRaw(message: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    // Check message size
    if (message.length > this.config.maxMessageSize!) {
      throw new Error(`Message size exceeds maximum of ${this.config.maxMessageSize} bytes`);
    }
    
    this.socket.send(message);
  }

  public sendMessage<T = unknown, R = void>(
    type: string, 
    payload: T, 
    observer?: PartialObserver<R>
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const messageId = Math.random().toString(36).substring(2, 15);
    const message: WebSocketMessage<T> = {
      id: messageId,
      type,
      payload,
      timestamp: Date.now()
    };

    try {
      this.socket.send(JSON.stringify(message));
      
      if (observer) {
        // Create a timeout for the request
        const timeout = setTimeout(() => {
          observer.error?.(new Error('Request timed out'));
          this.pendingRequests.delete(messageId);
        }, 30000);

        // Store the observer and timeout to handle the response
        this.pendingRequests.set(messageId, {
          type,
          payload,
          requestId: messageId,
          resolve: (value: any) => {
            clearTimeout(timeout);
            observer.next?.(value);
            observer.complete?.();
          },
          reject: (error: any) => {
            clearTimeout(timeout);
            observer.error?.(error);
          },
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      observer?.error?.(error);
    }
  }

  public onMessage<T = unknown>(messageType?: string): Observable<WebSocketMessage<T>> {
    return this.messageSubject.pipe(
      filter((message): message is WebSocketMessage<T> => {
        const matchesType = !messageType || message.type === messageType;
        const hasPayload = 'payload' in message;
        return matchesType && hasPayload;
      })
    );
  }
  
  public onReconnect(): Observable<boolean> {
    return this.connectionStatus.pipe(
      distinctUntilChanged(),
      filter(connected => connected === true)
    );
  }

  public close(): void {
    this.disconnect();
  }
  
  public send = this.sendMessage.bind(this);

  public disconnect(): void {
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close(1000, 'Client disconnected');
        }
      } catch (error) {
        console.error('Error during WebSocket disconnection:', error);
      } finally {
        this.socket = null;
      }
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnecting = false;
    this.connectionStatus.next(false);
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
    this.cleanup();
  }
}
