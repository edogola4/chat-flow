import { Message } from './message.model';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  type: RoomType;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  lastMessage?: Message;
  unreadCount: number;
  members: RoomMember[];
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  metadata?: RoomMetadata;
  permissions?: RoomPermissions;
}

export enum RoomType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group',
  CHANNEL = 'channel'
}

export interface RoomMember {
  userId: string;
  username: string;
  role: MemberRole;
  joinedAt: Date;
  lastReadMessageId?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  customTitle?: string;
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest'
}

export interface RoomMetadata {
  topic?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isEncrypted?: boolean;
  retentionDays?: number;
  maxMembers?: number;
}

export interface RoomPermissions {
  canSendMessages: boolean;
  canEditMessages: boolean;
  canDeleteMessages: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canChangeSettings: boolean;
  canPinMessages: boolean;
  canReact: boolean;
  canMentionAll: boolean;
}
