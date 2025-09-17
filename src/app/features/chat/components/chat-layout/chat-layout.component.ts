import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
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
  private destroy$ = new Subject<void>();

  rooms$: Observable<ChatRoom[]>;
  currentRoom$: Observable<ChatRoom | null>;
  isMobile = false;
  showSidebar = true;

  constructor() {
    this.rooms$ = this.chatService.getRooms();
    this.currentRoom$ = this.chatService.activeRoom$;
  }

  ngOnInit(): void {
    this.checkMobileView();
    window.addEventListener('resize', this.checkMobileView.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', this.checkMobileView.bind(this));
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
