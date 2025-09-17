import { User } from './user.model';

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
  status?: 'sent' | 'delivered' | 'read';
}
