import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-websocket-test',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  template: `
    <div class="test-container">
      <h2>WebSocket Test</h2>
      
      <div class="status" [class.connected]="isConnected" [class.disconnected]="!isConnected">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
      
      <div class="controls">
        <button mat-raised-button 
                color="primary" 
                (click)="sendPing()"
                [disabled]="!isConnected">
          Send Ping
        </button>
        
        <button mat-raised-button 
                color="warn" 
                (click)="disconnect()"
                [disabled]="!isConnected">
          Disconnect
        </button>
        
        <button mat-raised-button 
                color="accent" 
                (click)="connect()"
                [disabled]="isConnected">
          Connect
        </button>
      </div>
      
      <div class="messages">
        <h3>Messages:</h3>
        <div class="message" *ngFor="let msg of messages">
          <span class="timestamp">{{ msg.timestamp | date:'mediumTime' }}:</span>
          <span class="content">{{ msg.content }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-weight: bold;
      margin-bottom: 20px;
    }
    
    .connected {
      background-color: #4caf50;
    }
    
    .disconnected {
      background-color: #f44336;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .messages {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .message {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .timestamp {
      color: #666;
      font-size: 0.9em;
      margin-right: 10px;
    }
  `]
})
export class WebsocketTestComponent implements OnInit, OnDestroy {
  isConnected = false;
  messages: { content: string; timestamp: Date }[] = [];
  private destroy$ = new Subject<void>();

  constructor(private websocketService: WebsocketService) {}

  ngOnInit(): void {
    this.setupWebSocketListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  connect(): void {
    this.websocketService.connect();
  }

  disconnect(): void {
    this.websocketService.disconnect();
  }

  sendPing(): void {
    const timestamp = new Date();
    this.addMessage('Sending PING...', timestamp);
    
    this.websocketService.sendMessage('PING', { timestamp: timestamp.toISOString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.addMessage(`Received PONG: ${JSON.stringify(response)}`, new Date());
        },
        error: (error) => {
          this.addMessage(`Error: ${error.message}`, new Date());
        }
      });
  }

  private setupWebSocketListeners(): void {
    // Connection status
    this.websocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        this.addMessage(connected ? 'Connected to WebSocket server' : 'Disconnected from WebSocket server', new Date());
      });

    // Listen for broadcast messages
    this.websocketService.onMessageType('MESSAGE_BROADCAST')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        this.addMessage(`Broadcast: ${JSON.stringify(message)}`, new Date());
      });
  }

  private addMessage(content: string, timestamp: Date): void {
    this.messages.push({ content, timestamp });
    // Keep only the last 50 messages
    if (this.messages.length > 50) {
      this.messages.shift();
    }
  }
}
