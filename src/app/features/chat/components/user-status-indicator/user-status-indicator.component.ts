import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { User } from '../../models/user.model';
import { CommonModule, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-user-status-indicator',
  standalone: true,
  imports: [CommonModule, TitleCasePipe],
  template: `
    <div class="status-indicator" [ngClass]="user?.status || 'offline'">
      <span class="status-dot"></span>
      @if (showText) {
        <span class="status-text">{{ user?.status || 'offline' | titlecase }}</span>
      }
    </div>
  `,
  styles: [`
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    
    .online .status-dot {
      background-color: #4caf50;
      box-shadow: 0 0 5px #4caf50;
    }
    
    .offline .status-dot {
      background-color: #9e9e9e;
    }
    
    .away .status-dot {
      background-color: #ff9800;
      box-shadow: 0 0 5px #ff9800;
    }
    
    .busy .status-dot {
      background-color: #f44336;
      box-shadow: 0 0 5px #f44336;
    }
    
    .status-text {
      margin-left: 4px;
    }
  `]
})
export class UserStatusIndicatorComponent {
  @Input() user?: { status?: 'online' | 'offline' | 'away' | 'busy' };
  @Input() showText: boolean = false;
}
