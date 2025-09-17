import http from 'http';
import https from 'https';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a custom interface that extends the WebSocket type
// Extend WebSocket type with our custom properties
declare module 'ws' {
  interface WebSocket {
    id: string;
    userId?: string;
    lastPing: number;
    ip: string;
    userAgent?: string;
    isAlive: boolean;
    // Add missing method declarations
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    terminate(): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

// For type safety in our code
interface CustomWebSocket extends WebSocket {
  id: string;
  userId?: string;
  lastPing: number;
  ip: string;
  userAgent?: string;
  isAlive: boolean;
}

type Client = CustomWebSocket;

// Types
interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  token: string;
  ip: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'direct';
  members: Set<string>; // user IDs
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
}

// WebSocket type is extended via declaration merging above

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  points: 10, // 10 points
  duration: 1, // per second
});

// Message schemas
const BaseMessageSchema = z.object({
  type: z.string(),
  requestId: z.string().optional(),
  timestamp: z.number().optional(),
});

const AuthMessageSchema = BaseMessageSchema.extend({
  type: z.literal('AUTHENTICATE'),
  payload: z.object({
    token: z.string().min(1, 'Authentication token is required'),
    username: z.string().min(1, 'Username is required'),
    userAgent: z.string().optional(),
  }),
});

const JoinRoomMessageSchema = BaseMessageSchema.extend({
  type: z.literal('JOIN_ROOM'),
  payload: z.object({
    roomId: z.string().min(1, 'Room ID is required'),
  }),
});

const LeaveRoomMessageSchema = BaseMessageSchema.extend({
  type: z.literal('LEAVE_ROOM'),
  payload: z.object({
    roomId: z.string().min(1, 'Room ID is required'),
  }),
});

const ChatMessageSchema = BaseMessageSchema.extend({
  type: z.literal('SEND_MESSAGE'),
  payload: z.object({
    roomId: z.string().min(1, 'Room ID is required'),
    content: z.string().min(1, 'Message content cannot be empty'),
    type: z.enum(['text', 'image', 'file']).default('text'),
    metadata: z.record(z.unknown()).optional(),
  }),
});

const TypingStatusSchema = BaseMessageSchema.extend({
  type: z.literal('TYPING_STATUS'),
  payload: z.object({
    roomId: z.string().min(1, 'Room ID is required'),
    isTyping: z.boolean(),
  }),
});

type WsMessage = z.infer<typeof BaseMessageSchema> & {
  type: string;
  payload: unknown;
};

class ChatServer {
  private wss: any; // Temporarily using any to bypass type issues
  private clients: Map<string, Client> = new Map();
  private users: Map<string, User> = new Map();
  private rooms: Map<string, Room> = new Map();
  // messages is defined but never used, so we'll comment it out
  // private messages: Map<string, Message[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // roomId -> Set<userId>
  private messageHistory: Map<string, Message[]> = new Map(); // roomId -> Message[]
  private readonly MAX_MESSAGES_PER_ROOM = 1000;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(server: http.Server | https.Server) {
    this.wss = new WebSocket.Server({ server });
    this.setupEventHandlers();
    this.setupPingInterval();
    this.initializeDefaultRooms();
  }

  private initializeDefaultRooms() {
    const defaultRooms: Omit<Room, 'members'>[] = [
      {
        id: 'general',
        name: 'General',
        description: 'General discussion',
        type: 'public',
        createdAt: new Date(),
        createdBy: 'system',
        isActive: true,
      },
      {
        id: 'random',
        name: 'Random',
        description: 'Off-topic discussions',
        type: 'public',
        createdAt: new Date(),
        createdBy: 'system',
        isActive: true,
      },
    ];

    defaultRooms.forEach(room => {
      this.rooms.set(room.id, {
        ...room,
        members: new Set(),
      });
      this.messageHistory.set(room.id, []);
    });
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: any, req: http.IncomingMessage) => {
      const client = ws;
      const ip = req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      client.id = uuidv4();
      client.ip = ip;
      client.userAgent = userAgent;
      client.isAlive = true;
      client.lastPing = Date.now();

      this.clients.set(client.id, client);
      this.log(`New connection from ${ip} (${client.id})`);

      (ws as any).on('pong', () => this.handlePong(ws as CustomWebSocket));
      (ws as any).on('message', (data: WebSocket.Data) => this.handleMessage(ws as CustomWebSocket, data.toString()));
      (ws as any).on('close', () => this.handleDisconnect(ws as CustomWebSocket));
      (ws as any).on('error', (error: Error) => this.handleError(ws as CustomWebSocket, error));
    });
  }
  handlePong(arg0: CustomWebSocket) {
    throw new Error('Method not implemented.');
  }

  private setupPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      (this.wss.clients as Set<CustomWebSocket>).forEach((client) => {
        // If we haven't received a pong in 2 intervals, terminate the connection
        if (now - client.lastPing > this.PING_INTERVAL * 2) {
          client.terminate();
          return;
        }
        
        // Send ping to check if client is still alive
        if (!client.isAlive) {
          client.terminate();
          return;
        }

        client.isAlive = false;
        client.ping(() => {});
      });
    }, this.PING_INTERVAL);
  }

  private async handleMessage(ws: Client, data: string) {
    try {
      // Apply rate limiting
      await rateLimiter.consume(ws.ip);
      
      const message = this.parseMessage(data);
      if (!message) return;

      // Add request timestamp if not present
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      // Route the message to the appropriate handler
      switch (message.type) {
        case 'AUTHENTICATE':
          this.handleAuth(ws, message as z.infer<typeof AuthMessageSchema>);
          break;
        case 'JOIN_ROOM':
          this.handleJoinRoom(ws, message as z.infer<typeof JoinRoomMessageSchema>);
          break;
        case 'LEAVE_ROOM':
          this.handleLeaveRoom(ws, message as z.infer<typeof LeaveRoomMessageSchema>);
          break;
        case 'SEND_MESSAGE':
          this.handleChatMessage(ws, message as z.infer<typeof ChatMessageSchema>);
          break;
        case 'TYPING_STATUS':
          this.handleTypingStatus(ws, message as z.infer<typeof TypingStatusSchema>);
          break;
        default:
          this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`, message.requestId);
      }
    } catch (error) {
      this.handleError(ws, error);
    }
  }

  private parseMessage(data: string): WsMessage | null {
    try {
      const message = JSON.parse(data);
      
      // Basic validation
      if (!message || typeof message !== 'object') {
        throw new Error('Invalid message format: expected an object');
      }
      
      if (!message.type || typeof message.type !== 'string') {
        throw new Error('Invalid message format: missing or invalid type');
      }
      
      return message as WsMessage;
    } catch (error) {
      this.logError('Error parsing message:', error);
      return null;
    }
  }

  private handleError(ws: Client, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logError('WebSocket error:', errorMessage);
    ws.terminate();
  }

  private async handleAuth(ws: Client, message: z.infer<typeof AuthMessageSchema>) {
    try {
      const { token, username } = message.payload;
      
      // In a real app, validate the token against your auth service
      // For this example, we'll just create a user with the provided username
      const userId = `user-${uuidv4()}`;
      const user: User = {
        id: userId,
        username,
        status: 'online',
        lastSeen: new Date(),
        token,
        ip: ws.ip,
      };
      
      this.users.set(userId, user);
      ws.userId = userId;
      
      this.log(`User authenticated: ${username} (${userId})`);
      
      this.sendResponse(ws, {
        type: 'AUTH_SUCCESS',
        payload: {
          userId,
          username,
          status: 'online',
        },
        requestId: message.requestId,
      });
      
      // Send initial state
      this.sendInitialState(ws);
      
      // Send initial ping
      ws.ping();
      
    } catch (error) {
      this.sendError(ws, 'AUTH_ERROR', error instanceof Error ? error.message : 'Authentication failed', message.requestId);
    }
  }

  private async handleJoinRoom(ws: Client, message: z.infer<typeof JoinRoomMessageSchema>) {
    if (!ws.userId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Not authenticated', message.requestId);
      return;
    }

    const { roomId } = message.payload;
    const user = this.users.get(ws.userId);
    
    if (!user) {
      this.sendError(ws, 'USER_NOT_FOUND', 'User not found', message.requestId);
      return;
    }

    let room = this.rooms.get(roomId);
    
    // Create room if it doesn't exist (for demo purposes)
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId.slice(0, 8)}`,
        description: 'A new chat room',
        type: 'public',
        members: new Set(),
        createdAt: new Date(),
        createdBy: ws.userId,
        isActive: true,
      };
      this.rooms.set(roomId, room);
      this.messageHistory.set(roomId, []);
    }

    // Add user to room if not already a member
    if (!room.members.has(ws.userId)) {
      room.members.add(ws.userId);
      this.log(`User ${user.username} joined room ${roomId}`);
      
      // Notify other users in the room
      this.broadcastToRoom(roomId, ws, {
        type: 'USER_JOINED',
        payload: {
          userId: user.id,
          username: user.username,
          roomId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Send room info and message history to the user
    const messages = this.messageHistory.get(roomId) || [];
    const users = Array.from(room.members)
      .map(userId => {
        const u = this.users.get(userId);
        if (!u) return null;
        return {
          id: u.id,
          username: u.username,
          status: u.status,
          avatar: u.avatar,
        };
      })
      .filter(Boolean);

    this.sendResponse(ws, {
      type: 'ROOM_JOINED',
      payload: {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          type: room.type,
          memberCount: room.members.size,
          createdAt: room.createdAt.toISOString(),
        },
        messages: messages.slice(-100), // Last 100 messages
        users,
      },
      requestId: message.requestId,
    });
  }

  private async handleLeaveRoom(ws: Client, message: z.infer<typeof LeaveRoomMessageSchema>) {
    if (!ws.userId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Not authenticated', message.requestId);
      return;
    }

    const { roomId } = message.payload;
    const user = this.users.get(ws.userId);
    const room = this.rooms.get(roomId);

    if (!user || !room) {
      this.sendError(ws, 'INVALID_ROOM', 'Room not found', message.requestId);
      return;
    }

    if (!room.members.has(ws.userId)) {
      this.sendError(ws, 'NOT_A_MEMBER', 'You are not a member of this room', message.requestId);
      return;
    }

    // Remove user from room
    room.members.delete(ws.userId);
    this.log(`User ${user.username} left room ${roomId}`);

    // Notify other users in the room
    this.broadcastToRoom(roomId, null, {
      type: 'USER_LEFT',
      payload: {
        userId: user.id,
        username: user.username,
        roomId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleChatMessage(ws: Client, message: z.infer<typeof ChatMessageSchema>) {
    if (!ws.userId) {
      this.sendError(ws, 'UNAUTHORIZED', 'Not authenticated', message.requestId);
      return;
    }

    const { roomId, content, type, metadata } = message.payload;
    const user = this.users.get(ws.userId);
    const room = this.rooms.get(roomId);

    if (!user || !room) {
      this.sendError(ws, 'INVALID_ROOM', 'Room not found', message.requestId);
      return;
    }

    if (!room.members.has(ws.userId)) {
      this.sendError(ws, 'NOT_A_MEMBER', 'You are not a member of this room', message.requestId);
      return;
    }

    // Create and save message
    const newMessage: Message = {
      id: uuidv4(),
      roomId,
      userId: user.id,
      username: user.username,
      content,
      timestamp: new Date(),
      type: type || 'text',
      metadata
    };

    // Add to message history
    const roomMessages = this.messageHistory.get(roomId) || [];
    roomMessages.push(newMessage);
    
    // Keep only the most recent messages
    if (roomMessages.length > this.MAX_MESSAGES_PER_ROOM) {
      roomMessages.splice(0, roomMessages.length - this.MAX_MESSAGES_PER_ROOM);
    }
    
    this.messageHistory.set(roomId, roomMessages);

    // Broadcast to room
    this.broadcastToRoom(roomId, ws, {
      type: 'NEW_MESSAGE',
      payload: {
        ...newMessage,
        timestamp: newMessage.timestamp.toISOString()
      },
      requestId: message.requestId
    });
  }

  private async handleTypingStatus(ws: Client, message: z.infer<typeof TypingStatusSchema>) {
    if (!ws.userId) return;

    const { roomId, isTyping } = message.payload;
    const user = this.users.get(ws.userId);
    const room = this.rooms.get(roomId);

    if (!user || !room || !room.members.has(ws.userId)) return;

    // Update typing status
    if (isTyping) {
      let typingUsers = this.typingUsers.get(roomId) || new Set();
      typingUsers.add(ws.userId);
      this.typingUsers.set(roomId, typingUsers);
    } else {
      const typingUsers = this.typingUsers.get(roomId);
      if (typingUsers) {
        typingUsers.delete(ws.userId);
        if (typingUsers.size === 0) {
          this.typingUsers.delete(roomId);
        }
      }
    }

    // Broadcast typing status to other users in the room
    this.broadcastToRoom(roomId, ws, {
      type: 'TYPING_UPDATE',
      payload: {
        roomId,
        userId: user.id,
        username: user.username,
        isTyping,
      },
    });
  }

  private handleDisconnect(ws: Client) {
    const userId = ws.userId;
    if (!userId) {
      this.clients.delete(ws.id);
      return;
    }

    const user = this.users.get(userId);
    if (!user) {
      this.clients.delete(ws.id);
      return;
    }

    this.log(`User disconnected: ${user.username} (${userId})`);

    // Update user status and last seen
    user.status = 'offline';
    user.lastSeen = new Date();

    // Notify all rooms the user was in
    this.rooms.forEach(room => {
      if (room.members.has(userId)) {
        this.broadcastToRoom(room.id, null, {
          type: 'USER_STATUS_CHANGED',
          payload: {
            userId: user.id,
            username: user.username,
            status: 'offline',
            lastSeen: user.lastSeen.toISOString(),
          },
        });
      }
    });
    
    // Try to send an error message to the client before closing
    if (ws.readyState === 1) { // 1 = OPEN
      try {
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: {
            code: 'WEBSOCKET_ERROR',
            message: 'A WebSocket error occurred',
          },
        }));
      } catch (e) {
        // Ignore errors when sending the error message
      }
    }
    
    ws.terminate();
  }

  private sendInitialState(ws: Client) {
    if (!ws.userId) return;

    const rooms = Array.from(this.rooms.values())
      .filter(room => room.members.has(ws.userId!))
      .map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        type: room.type,
        memberCount: room.members.size,
        unreadCount: 0, // You would track this per user
      }));

    this.sendResponse(ws, {
      type: 'INITIAL_STATE',
      payload: {
        user: {
          id: ws.userId,
          username: this.users.get(ws.userId)?.username || 'Unknown',
          status: 'online',
        },
        rooms,
      },
    });
  }

  private sendResponse(ws: Client, response: {
    type: string;
    payload: unknown;
    requestId?: string;
  }) {
    if (ws.readyState === 1) { // 1 = OPEN
      ws.send(JSON.stringify({
        ...response,
        timestamp: Date.now(),
        requestId: response.requestId,
      }));
    }
  }

  private sendError(ws: Client, code: string, message: string, requestId?: string) {
    this.logError(`Error (${code}): ${message}`);
    this.sendResponse(ws, {
      type: 'ERROR',
      payload: { code, message },
      requestId,
    });
  }

  private broadcastToRoom(roomId: string, excludeWs: Client | null, message: unknown): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;

    const messageStr = JSON.stringify(message);
    let recipientCount = 0;

    (this.wss.clients as Set<CustomWebSocket>).forEach((client) => {
      if (client !== excludeWs && room.members.has(client.userId!)) {
        try {
          if ((client as any).readyState === 1) { // 1 = OPEN
            (client as any).send(messageStr);
            recipientCount++;
          }
        } catch (error) {
          this.logError('Error broadcasting message:', error);
        }
      }
    });
    
    if (recipientCount > 0) {
      this.log(`Broadcasted to ${recipientCount} clients in room ${roomId}`);
    }
    
    return recipientCount;
  }

  private log(...args: unknown[]): void {
    const timestamp = `[${new Date().toISOString()}]`;
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    console.log(timestamp, message);
  }

  private logError(...args: unknown[]): void {
    const timestamp = `[${new Date().toISOString()}] ERROR:`;
    const message = args.map(arg => 
      arg instanceof Error ? arg.stack || arg.message : 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : 
      String(arg)
    ).join(' ');
    console.error(timestamp, message);
  }
}

// Create HTTP server
const server = http.createServer();

// Initialize WebSocket server
const wss = new WebSocketServer({ server });
// The ChatServer class will be instantiated and manage the WebSocket server
new ChatServer(wss);

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// Handle process termination and graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    if ((client as WebSocket).readyState === 1) { // 1 = OPEN
      (client as WebSocket).close(1001, 'Server is shutting down');
    }
  });
  
  // Close the server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 5 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
}

// Handle various shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In a production app, you might want to log this to an external service
});

export {};
