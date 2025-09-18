import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil, switchMap } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/message.model';
import { ChatRoom } from '../../models/room.model';

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
    FormsModule
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
  newMessage = '';
  isTyping = false;
  private typingTimeout: any;

  constructor() {
    this.messages$ = this.chatService.activeRoomMessages$;
    this.currentRoom$ = this.chatService.activeRoom$;
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
