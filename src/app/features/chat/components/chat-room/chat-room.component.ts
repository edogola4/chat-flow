import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, ChatMessage } from '../../services/chat.service';

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
    MatSnackBarModule
  ],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  newMessage = '';
  username = 'User' + Math.floor(Math.random() * 1000);
  roomId = 'general';
  isConnected = false;
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Subscribe to messages
    this.chatService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages: ChatMessage[]) => {
        this.messages = messages;
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => this.scrollToBottom(), 0);
      });

    // Subscribe to connection status
    this.chatService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isConnected: boolean) => {
        this.isConnected = isConnected;
        this.showStatusMessage(isConnected ? 'Connected to chat' : 'Disconnected from chat');
        
        if (isConnected) {
          // Join the room when connected
          this.joinRoom();
        }
      });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    this.chatService.sendMessage(this.newMessage, this.username, this.roomId);
    this.newMessage = '';
  }

  joinRoom(): void {
    this.chatService.joinRoom(this.roomId, this.username);
    this.showStatusMessage(`Joined room: ${this.roomId}`);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      const element = document.getElementById('messageContainer');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  private showStatusMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
