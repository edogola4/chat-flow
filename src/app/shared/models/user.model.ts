export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  status: UserStatus;
  lastSeen: Date;
  isTyping?: boolean;
  preferences?: UserPreferences;
}

export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
  language: string;
  fontSize: number;
  messagePreview: boolean;
}
