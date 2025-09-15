// Type aliases for the missing types - these should be properly defined in your domain models
type Message = any;
type Room = any;
type User = any;

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType | string;
  payload: T;
  timestamp: string;
  requestId?: string;
}

export enum WebSocketMessageType {
  // Authentication
  AUTHENTICATE = 'AUTHENTICATE',
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Connection
  CONNECTION_ESTABLISHED = 'CONNECTION_ESTABLISHED',
  PING = 'PING',
  PONG = 'PONG',
  
  // Messages
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_UPDATED = 'MESSAGE_UPDATED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  MESSAGE_BROADCAST = 'MESSAGE_BROADCAST',
  
  // Typing indicators
  TYPING_START = 'TYPING_START',
  TYPING_END = 'TYPING_END',
  
  // Room events
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',
  
  // Error
  ERROR = 'ERROR'
}

// Payload interfaces
export interface MessagePayload {
  roomId: string;
  message: Message;
}

export interface RoomPayload {
  room: Room;
  userIds?: string[];
}

export interface UserPayload {
  user: User;
  roomId?: string;
}

export interface TypingPayload {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ReactionPayload {
  messageId: string;
  roomId: string;
  userId: string;
  userName: string;
  emoji: string;
  timestamp: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}
