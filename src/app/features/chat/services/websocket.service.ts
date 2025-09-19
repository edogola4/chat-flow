import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { Observable, Subject, BehaviorSubject, throwError, of, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { 
  retryWhen, 
  delay, 
  take, 
  tap, 
  catchError, 
  filter, 
  map, 
  switchMap, 
  finalize, 
  distinctUntilChanged,
  timeout,
  first
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
  shouldSend: () => boolean;
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
  private messageQueue: Array<QueuedMessage<any, any>> = [];
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private readonly destroy$ = new Subject<void>();
  private config: WebSocketConfig;
  private heartbeatIntervalId: any = null;
  private lastHeartbeat = 0;
  private authToken: string | null = null;
  private isAuthenticated = false;
  private pendingRequests = new Map<string, QueuedMessage>();
  private processedIndices = new Set<number>();
  private authState = new BehaviorSubject<{ isAuthenticated: boolean; error?: string }>({ isAuthenticated: false });
  public readonly authState$ = this.authState.asObservable();
  
  /**
   * Process the message queue and send any pending messages
   */
  private processMessageQueue(): void {
    if (!this.isConnected || !this.messageQueue.length) {
      return;
    }

    const indicesToRemove: number[] = [];
    
    this.messageQueue.forEach((queuedMsg, index) => {
      try {
        if (queuedMsg.shouldSend()) {
          this.send({
            type: queuedMsg.type,
            payload: queuedMsg.payload,
            requestId: queuedMsg.requestId
          } as WebSocketMessage);
          indicesToRemove.push(index);
          this.processedIndices.add(index);
        }
      } catch (error) {
        console.error('Error processing queued message:', error);
        indicesToRemove.push(index);
      }
    });

    // Remove processed messages in reverse order to avoid index shifting
    indicesToRemove
      .sort((a, b) => b - a) // Sort in descending order
      .forEach(index => {
        this.messageQueue.splice(index, 1);
      });
  }

  /**
   * Send a raw message through the WebSocket
   */
  public send<T = unknown, R = void>(
    message: WebSocketMessage<T>,
    options?: string | ((error?: Error) => void) | { 
      next?: (value: R) => void; 
      error?: (error: any) => void; 
      complete?: () => void;
      timeout?: number;
    }
  ): void | Promise<R> {
return this.sendMessage(message.type, message.payload, options);
  }

  /**
   * Send a message through the WebSocket with support for callbacks, promises, and observers
   */
  public sendMessage<T = unknown, R = void>(
    type: string,
    payload: T,
    options?: string | ((error?: Error) => void) | { 
      next?: (value: R) => void; 
      error?: (error: any) => void; 
      complete?: () => void;
      timeout?: number;
    }
  ): void | Promise<R> {
    // If WebSocket is not connected, return error or queue the message
    if (!this.isConnected) {
      const error = new Error('WebSocket is not connected');
      if (typeof options === 'function') {
        (options as (error: Error) => void)(error);
        return;
      }
      if (typeof options === 'object' && options?.error) {
        options.error(error);
        return;
      }
      if (typeof options === 'function') {
        (options as (error: Error) => void)(error);
        return;
      }
      throw error;
    }

    // If not authenticated and not an auth message, queue it
    if (!this.isAuthenticated && type !== MessageType.AUTHENTICATE) {
      const requestId = this.generateRequestId();
      const queuedMessage: QueuedMessage<T, R> = {
        type,
        payload,
        requestId,
        resolve: (value: R) => {},
        reject: (error: any) => {},
        timestamp: Date.now(),
        shouldSend: () => this.isConnected
      };

      this.messageQueue.push(queuedMessage);
      
      if (typeof options === 'object' && (options?.next || options?.error || options?.complete)) {
        // Handle observer pattern
        queuedMessage.resolve = (value: unknown) => {
          options.next?.(value as R);
          options.complete?.();
        };
        queuedMessage.reject = (error: any) => {
          options.error?.(error);
        };
        return;
      }
      
      // Handle promise pattern
      return new Promise<R>((resolve, reject) => {
        queuedMessage.resolve = resolve;
        queuedMessage.reject = reject;
      });
    }

    const requestId = this.generateRequestId();
    const message: WebSocketMessage<T> = {
      type,
      payload,
      requestId,
      timestamp: Date.now()
    };

    // Implementation for callback-style API
    if (typeof options === 'function') {
      const callback = options as (error?: Error) => void;
      
      try {
        this.sendRaw(JSON.stringify(message))
          .then(() => callback())
          .catch(error => callback(error));
      } catch (error) {
        callback(error as Error);
      }
      return;
    }

    // Implementation for Promise/Async API
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      return new Promise<R | void>((resolve, reject) => {
        this.sendRaw(JSON.stringify(message))
          .then(() => resolve())
          .catch(reject);
      }) as Promise<R>;
    }

    // Implementation for Observer-based API
    const { next, error: onError, complete } = options;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutMs = options.timeout || 30000; // Default 30s timeout

    // Set up timeout
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        const error = new Error(`Request ${type} timed out after ${timeoutMs}ms`);
        this.pendingRequests.delete(requestId);
        onError?.(error);
      }, timeoutMs);
    }

    // Add to pending requests
    this.pendingRequests.set(requestId, {
      type,
      payload,
      requestId,
      resolve: ((value: R) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (next) next(value);
        if (complete) complete();
      }) as (value: unknown) => void,
      reject: (error: any) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (onError) onError(error);
        if (error) {
          console.error('WebSocket message error:', error);
        }
      },
      timestamp: Date.now(),
      shouldSend: () => this.isConnected
    });

    // Send the message
    this.sendRaw(JSON.stringify(message))
      .catch(error => {
        if (timeoutId) clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        onError?.(error);
      });
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  }

  // Public observables
  public readonly connectionStatus$ = this.connectionStatus.asObservable();
  public readonly messages$ = this.messageSubject.asObservable();
  public readonly isConnected$ = this.connectionStatus.asObservable().pipe(distinctUntilChanged());

  /**
   * Check if the WebSocket is currently connected
   */
  public get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.config = { ...DEFAULT_CONFIG };
    
    if (isPlatformBrowser(this.platformId)) {
      this.connect();
    }
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

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
    
    // Reset authentication state on new connection
    this.isAuthenticated = false;
    this.authState.next({ isAuthenticated: false });
    
    // If we have a token, authenticate immediately
    if (this.authToken) {
      this.authenticate().subscribe({
        next: () => {
          console.log('[WebSocket] Authentication successful');
          this.processMessageQueue();
        },
        error: (err) => {
          console.error('[WebSocket] Authentication failed:', err);
          this.authState.next({ 
            isAuthenticated: false, 
            error: err.message || 'Authentication failed' 
          });
        }
      });
    }
  }

  /**
   * Authenticate with the WebSocket server
   * @param username Username to authenticate with
   * @returns Observable that completes when authentication is done
   */
  public authenticate(username?: string): Observable<boolean> {
    if (username) {
      this.authToken = username; // Using username as token for simplicity
    }

    if (!this.authToken) {
      const error = new Error('No username provided for authentication');
      this.authState.next({ isAuthenticated: false, error: error.message });
      return throwError(() => error);
    }

    return new Observable<boolean>(subscriber => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        const error = new Error('WebSocket is not connected');
        this.authState.next({ isAuthenticated: false, error: error.message });
        subscriber.error(error);
        return;
      }

      const subscription = this.messages$.pipe(
        filter((msg): msg is WebSocketMessage<{ success: boolean; message?: string }> => 
          msg.type === MessageType.AUTH_SUCCESS || msg.type === MessageType.AUTH_ERROR
        ),
        first(),
        timeout(10000) // 10 second timeout for auth response
      ).subscribe({
        next: (message) => {
          if (message.type === MessageType.AUTH_SUCCESS) {
            this.isAuthenticated = true;
            this.authState.next({ isAuthenticated: true });
            subscriber.next(true);
            subscriber.complete();
          } else {
            const error = new Error(message.payload?.message || 'Authentication failed');
            this.handleAuthError(error);
            subscriber.error(error);
          }
        },
        error: (err) => {
          this.handleAuthError(err);
          subscriber.error(err);
        }
      });

      // Send authentication request
      try {
        this.sendMessage(
          MessageType.AUTHENTICATE,
          { 
            username: this.authToken,
            timestamp: Date.now()
          },
          (error) => {
            if (error) {
              subscription.unsubscribe();
              const err = new Error(`Failed to send auth request: ${error.message}`);
              this.handleAuthError(err);
              subscriber.error(err);
            }
          }
        );
      } catch (error) {
        subscription.unsubscribe();
        const err = error instanceof Error ? error : new Error('Unknown error during authentication');
        this.handleAuthError(err);
        subscriber.error(err);
      }

      return () => subscription.unsubscribe();
    });
  }

  private handleAuthError(error: Error): void {
    console.error('[WebSocket] Authentication error:', error);
    this.isAuthenticated = false;
    this.authState.next({ 
      isAuthenticated: false, 
      error: error.message 
    });
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
      const message = JSON.parse(event.data as string) as WebSocketMessage;
      this.lastHeartbeat = Date.now();
      
      // Check for pending requests
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const request = this.pendingRequests.get(message.requestId)!;
        this.pendingRequests.delete(message.requestId);
        
        if (message.type === 'ERROR') {
          const errorPayload = message.payload as { message?: string };
          request.reject(new Error(errorPayload?.message || 'Request failed'));
        } else {
          request.resolve(message.payload);
        }
        return;
      }
      
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
      console.error(`[WebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Set authentication token and reconnect if needed
   */
  setAuthToken(token: string): void {
    if (this.authToken === token) {
      return;
    }
    
    this.authToken = token;
    
    // If connected, re-authenticate with the new token
    if (this.connectionStatus.value) {
      this.authenticate(token).subscribe({
        error: (err) => console.error('[WebSocket] Re-authentication failed:', err)
      });
    }
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
   * Send a raw message to the WebSocket
   */
  private sendRaw(message: string): Promise<void> {
    if (!this.socket) {
      throw new Error('WebSocket is not connected');
    }
    
    // Check message size
    const maxSize = this.config?.maxMessageSize || 1024 * 1024; // Default 1MB
    if (message.length > maxSize) {
      throw new Error(`Message size exceeds maximum of ${maxSize} bytes`);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        throw new Error('WebSocket is not connected');
      }
      this.socket.send(message);
      resolve();
    });
  }

  /**
   * Check if a message matches a specific type and has a payload
   */
  public hasMessageOfType<T = unknown>(messageType?: string): Observable<boolean> {
    return this.messages$.pipe(
      map((message) => {
        const matchesType = !messageType || message.type === messageType;
        const hasPayload = message.payload !== undefined;
        return matchesType && hasPayload;
      })
    );
  }
  
  /**
   * Observable that emits when the WebSocket reconnects
   */
  public onReconnect(): Observable<boolean> {
    return this.connectionStatus.pipe(
      distinctUntilChanged(),
      filter(connected => connected === true)
    );
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    this.disconnect();
  }
  

  /**
   * Disconnect the WebSocket and clean up resources
   */
  public disconnect(): void {
    if (this.socket) {
      try {
        // Clear all event handlers
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        
        // Close the connection if it's still open
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close(1000, 'Client disconnected');
        }
      } catch (error) {
        console.error('Error during WebSocket disconnection:', error);
      } finally {
        this.socket = null;
      }
    }
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Update connection status
    this.isConnecting = false;
    this.connectionStatus.next(false);
  }
}
