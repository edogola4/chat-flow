import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, ChatMessage } from '../../services/chat.service';

interface User {
  id: string;
  username: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  isTyping?: boolean;
}

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
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  newMessage = '';
  username = 'User' + Math.floor(Math.random() * 1000);
  roomId = 'general';
  isConnected = false;
  loading = false;
  currentUser: User | null = null;
  onlineUsers: User[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private snackBar: MatSnackBar
  ) {
    this.currentUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      username: this.username,
      status: 'online'
    };
  }

  ngOnInit(): void {
    // Subscribe to connection status
    this.chatService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isConnected => {
        this.isConnected = isConnected;
        if (isConnected) {
          this.loadMessages();
        }
      });

    // Subscribe to messages
    this.chatService.activeRoomMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.loading = false;
        this.scrollToBottom();
      });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMessages(): void {
    if (this.roomId) {
      this.loading = true;
      this.chatService.getMessagesForRoom(this.roomId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (messages) => {
            this.messages = messages;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading messages:', error);
            this.loading = false;
            this.showError('Failed to load messages');
          }
        });
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.roomId) return;
    
    this.chatService.sendMessage(this.newMessage, this.roomId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.newMessage = '';
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.showError('Failed to send message');
        }
      });
  }

  getUsername(userId: string): string {
    if (userId === this.currentUser?.id) return 'You';
    const user = this.onlineUsers.find(u => u.id === userId);
    return user?.username || 'Unknown User';
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id || index.toString();
  }
}
