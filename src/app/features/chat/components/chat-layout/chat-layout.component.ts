import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { RoomListComponent } from '../room-list/room-list.component';
import { ChatRoom } from '../../models/room.model';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    RoomListComponent
  ],
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss']
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  rooms: ChatRoom[] = [];
  currentRoom: ChatRoom | null = null;
  isMobile = false;
  showSidebar = true;

  constructor() {
    // Use async pipe in template instead of manual subscription
    this.chatService.getRooms().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        // Use markForCheck instead of detectChanges for better performance
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading rooms:', err)
    });

    this.chatService.activeRoom$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (room) => {
        this.currentRoom = room;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error in active room subscription:', err)
    });
  }

  ngOnInit(): void {
    this.checkMobileView();
    window.addEventListener('resize', this.checkMobileView.bind(this));
  }

  ngOnDestroy(): void {
    // Complete the destroy$ subject to clean up all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove the window resize event listener
    window.removeEventListener('resize', this.checkMobileView.bind(this));
    
    // Clean up any other resources if needed
    // The WebSocket service is provided at the root level, so it will be cleaned up by Angular
  }

  private checkMobileView(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.showSidebar = true;
    }
  }

  onRoomSelect(roomId: string): void {
    this.router.navigate(['/chat/room', roomId]);
    if (this.isMobile) {
      this.showSidebar = false;
    }
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }
}
