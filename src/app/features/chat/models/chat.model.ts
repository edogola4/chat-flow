export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  roomId: string;
  timestamp: Date;
  isEdited: boolean;
  editedAt?: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyTo?: string;
  reactions?: {
    emoji: string;
    userId: string;
    username: string;
  }[];
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: 'direct' | 'group';
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: number;
  members: {
    userId: string;
    username: string;
    role?: 'admin' | 'moderator' | 'member';
    joinedAt: Date;
  }[];
  isMuted?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  typingUsers?: string[];
}

export interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onlineUsers: User[];
  typingUsers: { [roomId: string]: { [userId: string]: boolean } };
  error: string | null;
  loading: boolean;
}

export interface SendMessagePayload {
  content: string;
  roomId: string;
  replyTo?: string;
  attachments?: File[];
}

export interface EditMessagePayload {
  messageId: string;
  content: string;
  roomId: string;
}

export interface DeleteMessagePayload {
  messageId: string;
  roomId: string;
}

export interface TypingIndicatorPayload {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

export interface UserStatusPayload {
  userId: string;
  status: UserStatus;
}

export interface CreateRoomPayload {
  name: string;
  type: 'direct' | 'group';
  participants: string[];
  description?: string;
}
