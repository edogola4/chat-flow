import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebsocketService, WebSocketMessage } from '../../core/services/websocket.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface MessageLog {
  type: 'sent' | 'received' | 'system';
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-websocket-test',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './websocket-test.component.html',
  styleUrls: ['./websocket-test.component.scss']
})
export class WebsocketTestComponent implements OnInit, OnDestroy {
  messages: MessageLog[] = [];
  isConnected = false;
  private destroy$ = new Subject<void>();

  constructor(
    private websocketService: WebsocketService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.websocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected: boolean) => {
        this.isConnected = connected;
        this.addSystemMessage(`WebSocket ${connected ? 'connected' : 'disconnected'}`);
      });

    this.websocketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: WebSocketMessage) => {
        this.addMessage('received', JSON.stringify(message));
      });
  }

  sendTestMessage(): void {
    const testMessage: WebSocketMessage = {
      type: 'test',
      data: { 
        text: 'Hello WebSocket!', 
        timestamp: new Date().toISOString() 
      }
    };
    
    this.websocketService.sendMessage(testMessage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success: boolean) => {
          if (success) {
            this.addMessage('sent', JSON.stringify(testMessage));
            this.snackBar.open('Test message sent', 'Close', { duration: 2000 });
          } else {
            this.snackBar.open('Message queued for sending when connected', 'Close', {
              duration: 2000
            });
          }
        },
        error: (err: Error) => {
          this.snackBar.open(`Failed to send message: ${err.message}`, 'Close', {
            duration: 3000
          });
        }
      });
  }

  toggleConnection(): void {
    if (this.isConnected) {
      this.websocketService.closeConnection();
    } else {
      this.websocketService.reconnect();
    }
  }

  private addMessage(type: 'sent' | 'received', message: string): void {
    this.messages.push({
      type,
      message,
      timestamp: new Date()
    });
  }

  private addSystemMessage(message: string): void {
    this.messages.push({
      type: 'system',
      message,
      timestamp: new Date()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
