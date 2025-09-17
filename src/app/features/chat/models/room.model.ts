// Last message preview interface
export interface LastMessagePreview {
  id: string;
  content: string;
  senderName: string;
  timestamp: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  createdAt: Date;
  lastMessage?: LastMessagePreview;
  unreadCount: number;
  isActive?: boolean;
}

export interface CreateRoomDto {
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members?: string[];
}
