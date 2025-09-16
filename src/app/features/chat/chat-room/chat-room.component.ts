import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { 
  Subscription, 
  debounceTime, 
  distinctUntilChanged, 
  tap,
  firstValueFrom,
  Observable,
  BehaviorSubject,
  Subject
} from 'rxjs';

import { ChatService, ChatMessage, ChatRoom, User } from '../services/chat.service';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar.component';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    UserAvatarComponent,
  ],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private cdr = inject(ChangeDetectorRef);
  
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;
  
  // Component state
  isTyping = false;
  messages: ChatMessage[] = [];
  activeRoom: ChatRoom | null = null;
  onlineUsers: User[] = [];
  typingUsers: {[userId: string]: boolean} = {};  // Current user and message state
  currentUser: User = {
    id: 'current-user',
    username: 'Current User',
    status: 'online'
  }; // Made public for template access
  private currentUserSubscription: Subscription | null = null;
  messageText = '';
  roomId = '';
  username = '';
  showNewChatButton = true;
  
  // Private properties
  private typingTimeout: any = null;
  private readonly TYPING_TIMER_LENGTH = 2000; // 2 seconds
  private lastTypingTime = 0;
  private readonly TYPING_DEBOUNCE_TIME = 3000; // 3 seconds
  private subscriptions = new Subscription();
  private destroyed$ = new Subject<void>();
  private isInitialized = false;
loading: any;
  newMessage!: string;
  
  constructor() {
    // Initialize current user
    this.currentUser = { 
      id: this.chatService.getCurrentUserId(),
      username: 'Current User',
      status: 'online'
    };
    this.username = this.currentUser.username;
  }
  
  ngOnInit(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    // Set default room
    this.roomId = 'general';
    
    // Subscribe to active room messages
    this.subscriptions.add(
      this.chatService.activeRoomMessages$.pipe(
        tap(messages => {
          this.messages = messages || [];
          this.cdr.markForCheck();
        })
      ).subscribe()
    );
    
    // Subscribe to online users
    this.subscriptions.add(
      this.chatService.onlineUsers$.pipe(
        tap(users => {
          this.onlineUsers = users || [];
          this.cdr.markForCheck();
        })
      ).subscribe()
    );
    
    // Subscribe to typing users
    this.subscriptions.add(
      this.chatService.typingUsers$.pipe(
        tap(typingUsers => {
          this.typingUsers = typingUsers?.[this.roomId] || {};
          this.cdr.markForCheck();
        })
      ).subscribe()
    );
    
    // Subscribe to active room
    this.subscriptions.add(
      this.chatService.activeRoom$.pipe(
        tap(room => {
          this.activeRoom = room || null;
          this.cdr.markForCheck();
        })
      ).subscribe()
    );
    
    // Join the default room
    this.joinRoom(this.roomId, this.username).catch(error => {
      console.error('Error joining room:', error);
    });
    
    // Subscribe to connection status
    this.subscriptions.add(
      this.chatService.connectionStatus$.pipe(
        tap(isConnected => {
          console.log('Connection status:', isConnected ? 'Connected' : 'Disconnected');
          if (isConnected) {
            // Rejoin room if reconnected
            this.joinRoom(this.roomId, this.username).catch(console.error);
          }
        })
      ).subscribe()
    );
  }
  
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
    
    // Clear any pending timeouts
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // Complete the destroyed$ subject
    this.destroyed$.next();
    this.destroyed$.complete();
  }
  
  async joinRoom(roomId: string, username: string): Promise<void> {
    if (!roomId || !username) {
      console.error('Cannot join room: missing roomId or username');
      return;
    }
    
    console.log(`Attempting to join room ${roomId} as ${username}`);
    
    try {
      await firstValueFrom(this.chatService.joinRoom(roomId, username));
      console.log(`Successfully joined room ${roomId}`);
      this.roomId = roomId;
      this.chatService.setActiveRoom(roomId);
    } catch (error) {
      console.error('Error joining room:', error);
      // Retry after a delay
      setTimeout(() => this.joinRoom(roomId, username), 2000);
    }
  }
  
  sendMessage(): void {
    if (!this.messageText.trim() || !this.roomId) {
      return;
    }
    
    const messageContent = this.messageText.trim();
    this.messageText = '';
    this.isTyping = false;
    
    this.chatService.sendMessage(messageContent, this.roomId).subscribe({
      next: () => {
        // Message sent successfully
      },
      error: (error) => {
        console.error('Error sending message:', error);
      }
    });
  }
  
  onTyping(): void {
    if (!this.roomId) return;
    
    // Clear any existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    // User is typing
    if (this.messageText.trim().length > 0) {
      if (!this.isTyping) {
        this.isTyping = true;
        this.chatService.updateTypingStatus(
          this.chatService.getCurrentUserId(), 
          this.roomId, 
          true
        );
      }
      
      // Set a timeout to indicate user stopped typing
      this.typingTimeout = setTimeout(() => {
        this.isTyping = false;
        this.chatService.updateTypingStatus(
          this.chatService.getCurrentUserId(), 
          this.roomId, 
          false
        );
      }, this.TYPING_TIMER_LENGTH);
    } else if (this.isTyping) {
      this.isTyping = false;
      this.chatService.updateTypingStatus(
        this.chatService.getCurrentUserId(), 
        this.roomId, 
        false
      );
    }
  }
  
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  trackByMessageId(index: number, message: ChatMessage): string {
    return message?.id || index.toString();
  }
  
  trackByUserId(index: number, user: User): string {
    return user?.id || index.toString();
  }

  // Get typing indicator text
  getTypingIndicatorText(typingUsers: User[]): string {
    if (typingUsers.length === 0) return '';
    
    // Filter out current user from typing indicators
    const otherTypingUsers = typingUsers.filter(user => user.id !== this.currentUser?.id);
    
    if (otherTypingUsers.length === 0) return '';
    if (otherTypingUsers.length === 1) return `${otherTypingUsers[0].username} is typing...`;
    if (otherTypingUsers.length === 2) return `${otherTypingUsers[0].username} and ${otherTypingUsers[1].username} are typing...`;
    if (otherTypingUsers.length === 3) return `${otherTypingUsers[0].username}, ${otherTypingUsers[1].username} and 1 other are typing...`;
    return `${otherTypingUsers[0].username}, ${otherTypingUsers[1].username} and ${otherTypingUsers.length - 2} others are typing...`;
  }
  
  // Get the list of users who are currently typing
  get typingUsersList(): { key: string, value: boolean }[] {
    if (!this.typingUsers || !this.roomId) return [];
    
    return Object.entries(this.typingUsers)
      .filter(([userId, isTyping]) => isTyping && userId !== this.currentUser?.id)
      .map(([key, value]) => ({ key, value }));
  }
  
  // Get users who are currently typing as User array
  getTypingUsers(): User[] {
    if (!this.typingUsers || !this.roomId) return [];
    
    return Object.entries(this.typingUsers)
      .filter(([userId, isTyping]) => isTyping && userId !== this.currentUser?.id)
      .map(([userId]) => this.getUser(userId))
      .filter((user): user is User => user !== null);
  }
  
  // Get user by ID
  getUser(userId: string): User | null {
    if (this.currentUser?.id === userId) {
      return this.currentUser;
    }
    return this.onlineUsers.find(user => user.id === userId) || null;
  }
  
  // Get username by user ID
  getUsername(userId: string): string {
    return this.getUser(userId)?.username || 'Unknown User';
  }
  
  // Handle message input events
  onMessageInput(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    } else {
      this.onTyping();
    }
  }
  
  // Start a new chat
  startNewChat(): void {
    this.showNewChatButton = false;
    this.newMessage = '';
    this.messages = [];
    this.typingUsers = {};
    this.cdr.markForCheck();
  }
}
