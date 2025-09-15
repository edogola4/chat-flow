import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebsocketService } from '../../core/services/websocket.service';

interface MessageLog {
  type: 'sent' | 'received' | 'system';
  event: string;
  data: any;
  timestamp: Date;
}

@Component({
  selector: 'app-websocket-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './websocket-demo.component.html',
  styleUrls: ['./websocket-demo.component.scss']
})
export class WebsocketDemoComponent implements OnInit, OnDestroy {
  messageType = 'test';
  messageData = 'Hello WebSocket!';
  isConnected = false;
  messages: MessageLog[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private websocketService: WebsocketService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Listen for connection status changes
    this.websocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        this.logMessage('system', `WebSocket ${connected ? 'connected' : 'disconnected'}`);
      });

    // Listen for all messages
    this.websocketService.onMessageType('*')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        this.logMessage('received', message.type, message);
      });
  }

  sendMessage(): void {
    if (!this.messageType.trim()) {
      this.snackBar.open('Please enter a message type', 'Close', { duration: 3000 });
      return;
    }

    const data = this.parseMessageData(this.messageData);
    
    this.websocketService.sendMessage(this.messageType, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.logMessage('sent', this.messageType, data);
          this.snackBar.open('Message sent successfully', 'Close', { duration: 2000 });
        },
        error: (error) => {
          this.snackBar.open(`Error: ${error.message}`, 'Close', { duration: 3000 });
        }
      });
  }

  sendPing(): void {
    this.websocketService.sendMessage('PING', { timestamp: new Date().toISOString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.logMessage('sent', 'PING', {});
        },
        error: (error) => {
          this.snackBar.open(`Ping failed: ${error.message}`, 'Close', { duration: 3000 });
        }
      });
  }

  private parseMessageData(data: string): any {
    try {
      // Try to parse as JSON, if it fails return as string
      return JSON.parse(data);
    } catch (e) {
      return { message: data };
    }
  }

  private logMessage(type: 'sent' | 'received' | 'system', event: string, data: any = {}): void {
    this.messages.unshift({
      type,
      event,
      data,
      timestamp: new Date()
    });

    // Keep only the last 50 messages
    if (this.messages.length > 50) {
      this.messages.pop();
    }
  }

  getMessageTypeClass(type: 'sent' | 'received' | 'system'): string {
    switch (type) {
      case 'sent':
        return 'sent-message';
      case 'received':
        return 'received-message';
      case 'system':
        return 'system-message';
      default:
        return '';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
