import { User } from './user.model';

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  roomId: string;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  replyTo?: string;
  metadata?: MessageMetadata;
  readBy?: string[];
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  NOTIFICATION = 'notification'
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number; // For video/audio
  status?: 'uploading' | 'uploaded' | 'error';
  error?: string;
}

export interface MessageMetadata {
  mentions?: string[];
  links?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  }[];
  code?: {
    language: string;
    content: string;
  };
}
