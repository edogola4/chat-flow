export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  bio?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    [key: string]: string | undefined;
  };
}
