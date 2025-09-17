import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'other';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    FormsModule
  ],
  template: `
    <div class="chat-container">
      <!-- Chat header -->
      <div class="chat-header">
        <div class="user-info">
          <div class="avatar">
            <span>JD</span>
          </div>
          <div class="user-details">
            <h3>Bran Don</h3>
            <span class="status online">Online</span>
          </div>
        </div>
        <div class="chat-actions">
          <button mat-icon-button>
            <mat-icon>phone</mat-icon>
          </button>
          <button mat-icon-button>
            <mat-icon>videocam</mat-icon>
          </button>
          <button mat-icon-button>
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>
      
      <!-- Messages -->
      <div class="messages-container">
        <div class="messages" #messagesContainer>
          <div 
            *ngFor="let message of messages" 
            [class]="'message ' + (message.sender === 'user' ? 'sent' : 'received')"
          >
            <div class="message-content">
              {{ message.content }}
            </div>
            <div class="message-time">
              {{ message.timestamp | date:'shortTime' }}
              <mat-icon *ngIf="message.sender === 'user'" class="message-status">
                {{ getStatusIcon(message.status) }}
              </mat-icon>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Message input -->
      <div class="message-input">
        <button mat-icon-button>
          <mat-icon>add</mat-icon>
        </button>
        <mat-form-field appearance="outline" class="message-field">
          <input 
            matInput 
            [(ngModel)]="newMessage" 
            placeholder="Type a message..."
            (keyup.enter)="sendMessage()"
          >
        </mat-form-field>
        <button mat-icon-button>
          <mat-icon>sentiment_satisfied</mat-icon>
        </button>
        <button mat-icon-button (click)="sendMessage()" [disabled]="!newMessage.trim()">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--background-primary);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background-color: var(--background-secondary);
      border-bottom: 1px solid var(--border-color);
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--primary-500);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }
    
    .user-details h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
    }
    
    .status {
      font-size: 0.75rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      
      &::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
      }
      
      &.online::before {
        background-color: var(--success);
      }
      
      &.offline::before {
        background-color: var(--text-tertiary);
      }
    }
    
    .chat-actions {
      display: flex;
      gap: 8px;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background-color: var(--background-primary);
    }
    
    .messages {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .message {
      max-width: 70%;
      padding: 10px 16px;
      border-radius: 18px;
      position: relative;
      word-wrap: break-word;
      line-height: 1.4;
      
      &.sent {
        align-self: flex-end;
        background-color: var(--primary-500);
        color: white;
        border-bottom-right-radius: 4px;
        
        .message-time {
          color: rgba(255, 255, 255, 0.8);
          text-align: right;
        }
      }
      
      &.received {
        align-self: flex-start;
        background-color: var(--message-received-bg);
        color: var(--message-received-text);
        border-bottom-left-radius: 4px;
        
        .message-time {
          color: var(--text-tertiary);
        }
      }
    }
    
    .message-time {
      font-size: 0.7rem;
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .message-status {
      font-size: 0.9rem;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .message-input {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background-color: var(--background-secondary);
      border-top: 1px solid var(--border-color);
      
      .message-field {
        flex: 1;
        margin: 0 12px;
        
        .mat-mdc-form-field-outline {
          background-color: var(--background-primary);
        }
        
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
          border-color: var(--border-color);
        }
        
        .mdc-text-field--outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-notched-outline .mdc-notched-outline__leading,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-notched-outline .mdc-notched-outline__notch,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled):not(.mdc-text-field--focused):hover .mdc-notched-outline .mdc-notched-outline__trailing {
          border-color: var(--primary-300);
        }
        
        .mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline__leading,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline__notch,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled).mdc-text-field--focused .mdc-notched-outline__trailing {
          border-color: var(--primary-500);
        }
      }
    }
  `]
})
export class ChatComponent {
  newMessage = '';
  messages: Message[] = [
    {
      id: 1,
      content: 'Hey there! How are you doing?',
      sender: 'other',
      timestamp: new Date(Date.now() - 3600000),
      status: 'read'
    },
    {
      id: 2,
      content: 'I\'m doing great, thanks for asking! How about you?',
      sender: 'user',
      timestamp: new Date(Date.now() - 1800000),
      status: 'read'
    },
    {
      id: 3,
      content: 'I\'m doing well too. Just working on some new features for our chat app.',
      sender: 'other',
      timestamp: new Date(),
      status: 'read'
    }
  ];

  getStatusIcon(status: string): string {
    switch (status) {
      case 'sending':
        return 'schedule';
      case 'sent':
        return 'done';
      case 'delivered':
        return 'done_all';
      case 'read':
        return 'done_all';
      default:
        return 'schedule';
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now(),
      content: this.newMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };
    
    this.messages.push(message);
    this.newMessage = '';
    
    // Simulate message being sent and delivered
    setTimeout(() => {
      const sentMessage = this.messages.find(m => m.id === message.id);
      if (sentMessage) {
        sentMessage.status = 'sent';
      }
    }, 1000);
    
    setTimeout(() => {
      const deliveredMessage = this.messages.find(m => m.id === message.id);
      if (deliveredMessage) {
        deliveredMessage.status = 'delivered';
      }
    }, 2000);
    
    // Scroll to bottom after sending a message
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
  
  private scrollToBottom(): void {
    const container = document.querySelector('.messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}
