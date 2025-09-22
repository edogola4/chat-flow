import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap, map, combineLatest } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/message.model';
import { User } from '../../models/user.model';
import { ChatRoom } from '../../models/room.model';
import { UserStatusIndicatorComponent } from '../user-status-indicator/user-status-indicator.component';

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
    MatToolbarModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    FormsModule,
    UserStatusIndicatorComponent,
    DatePipe
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  chatService = inject(ChatService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  messages$: Observable<ChatMessage[]>;
  currentRoom$: Observable<ChatRoom | null>;
  onlineUsers$: Observable<User[]>;
  newMessage = '';
  isTyping = false;
  private typingTimeout: any;
  currentUser: User | null = null;

  constructor() {
    this.messages$ = this.chatService.activeRoomMessages$;
    this.currentRoom$ = this.chatService.activeRoom$;
    this.onlineUsers$ = this.chatService.state$.pipe(
      map(state => state.users.filter(user => user.status !== 'offline')),
      distinctUntilChanged((prev, curr) => 
        JSON.stringify(prev) === JSON.stringify(curr)
      )
    );
    
    // Get current user (in a real app, this would come from auth service)
    this.chatService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        // In a real app, you'd get the current user ID from your auth service
        this.currentUser = state.users[0] || null; // Simplified for demo
      });
  }

  ngOnInit(): void {
    // First ensure we're connected to WebSocket
    this.chatService.ensureConnected().pipe(
      takeUntil(this.destroy$),
      // Then subscribe to route params
switchMap(() => this.route.paramMap)
    ).subscribe((params: any) => {
      const roomId = params.get('id');
      if (roomId) {
        this.chatService.joinRoom(roomId).subscribe({
          next: () => {
            console.log(`Successfully joined room: ${roomId}`);
          },
          error: (err) => {
            console.error(`Failed to join room ${roomId}:`, err);
          }
        });
      }
    });
  }

  getUserStatus(userId: string): Observable<string> {
    return this.chatService.state$.pipe(
      map(state => {
        const user = state.users.find(u => u.id === userId);
        return user?.status || 'offline';
      })
    );
  }

  getLastSeen(user: User): string {
    if (user.status !== 'offline' || !user.lastSeen) return '';
    
    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 24 * 60) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return lastSeen.toLocaleDateString();
  }

  setUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    // In a real app, you would call a method on the chat service to update the status
    // For now, we'll just update the local user object
    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        status,
        lastSeen: new Date()
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;

    const roomId = this.route.snapshot.paramMap.get('id');
    if (!roomId) return;

    this.chatService.sendMessage(this.newMessage, roomId).subscribe({
      next: () => {
        this.newMessage = '';
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to send message:', err);
      }
    });
  }

  onTyping(): void {
    if (!this.isTyping) {
      this.isTyping = true;
      const roomId = this.route.snapshot.paramMap.get('id');
      if (roomId) {
        this.chatService.updateTypingStatus(this.chatService.getCurrentUserId(), roomId, true);
      }
    }

    // Reset typing status after 2 seconds of inactivity
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      const roomId = this.route.snapshot.paramMap.get('id');
      if (roomId) {
        this.chatService.updateTypingStatus(this.chatService.getCurrentUserId(), roomId, false);
      }
    }, 2000);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
