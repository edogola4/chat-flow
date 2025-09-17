import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { ChatRoom } from '../../models/room.model';
import { ChatService } from '../../services/chat.service';
import { CreateRoomDialogComponent } from '../create-room-dialog/create-room-dialog.component';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule,
    MatTooltipModule
  ],
  templateUrl: './room-list.component.html',
  styleUrls: ['./room-list.component.scss']
})
export class RoomListComponent implements OnChanges {
  @Input() rooms: ChatRoom[] = [];
  @Input() currentRoom: ChatRoom | null = null;
  @Output() roomSelected = new EventEmitter<string>();
  @Output() roomCreated = new EventEmitter<ChatRoom>();

  constructor(
    private dialog: MatDialog,
    private chatService: ChatService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Handle input changes if needed
  }

  onRoomClick(roomId: string): void {
    this.roomSelected.emit(roomId);
  }

  openCreateRoomDialog(): void {
    const dialogRef = this.dialog.open(CreateRoomDialogComponent, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.chatService.createRoom(result).subscribe({
          next: (room) => {
            this.roomCreated.emit(room);
            this.roomSelected.emit(room.id);
          },
          error: (error) => {
            console.error('Error creating room:', error);
          }
        });
      }
    });
  }

  isRoomActive(room: ChatRoom): boolean {
    return this.currentRoom?.id === room.id;
  }
}
