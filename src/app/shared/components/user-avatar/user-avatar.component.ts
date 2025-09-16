import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="avatar-container" [class]="size">
      <div class="avatar" [style.backgroundImage]="'url(' + (user?.avatar || 'assets/default-avatar.png') + ')'">
        <span class="status" [ngClass]="user?.status || 'offline'"></span>
      </div>
      <span *ngIf="showName" class="username">{{ user?.displayName || user?.username }}</span>
    </div>
  `,
  styles: [`
    .avatar-container {
      display: flex;
      align-items: center;
      gap: 8px;
      
      &.small {
        .avatar {
          width: 32px;
          height: 32px;
        }
      }
      
      &.medium {
        .avatar {
          width: 48px;
          height: 48px;
        }
      }
      
      &.large {
        .avatar {
          width: 64px;
          height: 64px;
        }
      }
    }
    
    .avatar {
      position: relative;
      border-radius: 50%;
      background-size: cover;
      background-position: center;
      background-color: #e0e0e0;
      
      .status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        
        &.online { background-color: #4caf50; }
        &.away { background-color: #ffc107; }
        &.busy { background-color: #f44336; }
        &.offline { background-color: #9e9e9e; }
      }
    }
    
    .username {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.87);
    }
  `]
})
export class UserAvatarComponent {
  @Input() user: User | null = null;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showName = false;
}
