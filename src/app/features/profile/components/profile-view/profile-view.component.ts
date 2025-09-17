import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { Router, RouterModule } from '@angular/router';
import { Observable, switchMap, takeUntil, Subject, tap } from 'rxjs';

// Local imports
import { ProfileService, UserProfile } from '../../services/profile.service';
import { AuthService, User } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule
  ],
  templateUrl: './profile-view.component.html',
  styleUrls: ['./profile-view.component.scss']
})
export class ProfileViewComponent implements OnInit, OnDestroy {
  // Services
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  
  // Component state
  readonly profile$: Observable<UserProfile | null>;
  isCurrentUser = false;
  userId: string | null = null;

  constructor() {
    this.profile$ = this.authService.currentUser$.pipe(
      takeUntil(this.destroy$),
      tap((user: User | null) => {
        if (user) {
          this.isCurrentUser = true;
          this.userId = user.id;
        } else {
          this.isCurrentUser = false;
          this.userId = null;
        }
      }),
      switchMap(() => this.profileService.loadProfile())
    );
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'primary';
      case 'away': return 'accent';
      case 'busy': return 'warn';
      default: return '';
    }
  }
}
