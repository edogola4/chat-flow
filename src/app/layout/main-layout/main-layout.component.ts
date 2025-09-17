import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeToggleComponent } from '../../core/theme/theme-toggle/theme-toggle.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ThemeToggleComponent,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatTooltipModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container" [class.mobile-view]="isMobile()">
      <!-- Sidenav -->
      <mat-sidenav #sidenav 
                  [mode]="isMobile() ? 'over' : 'side'" 
                  [opened]="!isMobile()" 
                  class="sidenav"
                  (closed)="onSidenavClose()">
        
        <div class="sidenav-header">
          <h2>ChatFlow</h2>
          @if (isMobile()) {
            <button mat-icon-button (click)="sidenav.toggle()" class="sidenav-toggle">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        
        <mat-nav-list>
          <a mat-list-item routerLink="/" routerLinkActive="active" (click)="onNavItemClick()">
            <mat-icon>chat</mat-icon>
            <span>Chats</span>
          </a>
          <a mat-list-item routerLink="/profile" routerLinkActive="active" (click)="onNavItemClick()">
            <mat-icon>person</mat-icon>
            <span>Profile</span>
          </a>
          <a mat-list-item routerLink="/settings" routerLinkActive="active" (click)="onNavItemClick()">
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </a>
        </mat-nav-list>
        
        <div class="sidenav-footer">
          <app-theme-toggle></app-theme-toggle>
        </div>
      </mat-sidenav>
      
      <!-- Main content -->
      <mat-sidenav-content class="sidenav-content">
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" class="sidenav-toggle" matTooltip="Toggle Menu">
            <mat-icon>menu</mat-icon>
          </button>
          
          <h1 class="app-title">
            @if (isMobile() && sidenav.opened) {
              <span>Menu</span>
            } @else {
              <span>ChatFlow</span>
            }
          </h1>
          
          <span class="spacer"></span>
          
          <div class="toolbar-actions">
            <!-- Additional toolbar actions can go here -->
            <app-theme-toggle></app-theme-toggle>
          </div>
        </mat-toolbar>
        
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      --sidenav-width: 250px;
      --toolbar-height: 64px;
      --border-color: rgba(0, 0, 0, 0.12);
      --background-primary: #ffffff;
      --background-secondary: #f5f5f5;
      --text-primary: rgba(0, 0, 0, 0.87);
      --text-secondary: rgba(0, 0, 0, 0.6);
      --primary-100: #e3f2fd;
      --primary-700: #1976d2;
    }

    :host-context(.dark-theme) {
      --background-primary: #121212;
      --background-secondary: #1e1e1e;
      --text-primary: rgba(255, 255, 255, 0.87);
      --text-secondary: rgba(255, 255, 255, 0.6);
      --border-color: rgba(255, 255, 255, 0.12);
    }

    .sidenav-container {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      
      &.mobile-view {
        .sidenav {
          position: fixed;
          z-index: 1000;
        }
        
        .sidenav-backdrop {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }
      }
    }
    
    .sidenav {
      width: var(--sidenav-width);
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-color);
      background-color: var(--background-secondary);
      transition: transform 0.3s ease, width 0.3s ease;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
      
      @media (max-width: 959px) {
        transform: translateX(-100%);
        
        &.mat-sidenav-opened {
          transform: translateX(0);
        }
      }
    }
    
    .sidenav-header {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      height: var(--toolbar-height);
      box-sizing: border-box;
      
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .sidenav-toggle {
        @media (min-width: 960px) {
          display: none;
        }
      }
    }
    
    .sidenav-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--background-primary);
      transition: margin 0.3s ease;
      
      @media (min-width: 960px) {
        margin-left: var(--sidenav-width);
      }
    }
    
    .sidenav-footer {
      margin-top: auto;
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: center;
      background-color: var(--background-secondary);
    }
    
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      padding: 0 16px;
      height: var(--toolbar-height);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      background-color: var(--background-secondary);
      
      .app-title {
        margin: 0 16px;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      @media (max-width: 599px) {
        padding: 0 8px;
        
        .app-title {
          font-size: 1.1rem;
          margin: 0 8px;
        }
      }
    }
    
    .content {
      padding: 24px;
      flex: 1;
      overflow-y: auto;
      background-color: var(--background-primary);
      
      @media (max-width: 599px) {
        padding: 16px;
      }
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    mat-nav-list {
      padding-top: 0;
      
      a {
        color: var(--text-primary);
        text-decoration: none;
        transition: background-color 0.2s ease;
        
        &:hover {
          background-color: var(--primary-100);
        }
        
        &.active {
          background-color: var(--primary-100);
          color: var(--primary-700);
          
          mat-icon {
            color: var(--primary-700);
          }
        }
        
        mat-icon {
          margin-right: 16px;
          color: var(--text-secondary);
        }
      }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private themeService = inject(ThemeService);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);
  
  // Track if we're on a mobile device
  isMobile = signal(false);
  
  // Navigation items
  navItems = [
    { path: '/', icon: 'chat', label: 'Chats' },
    { path: '/profile', icon: 'person', label: 'Profile' },
    { path: '/settings', icon: 'settings', label: 'Settings' }
  ];

  ngOnInit(): void {
    // Check for mobile view
    this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait
    ]).subscribe(result => {
      this.isMobile.set(result.matches);
    });
  }
  
  /**
   * Handle navigation item click on mobile
   */
  onNavItemClick(): void {
    if (this.isMobile()) {
      // Close the sidenav after navigation on mobile
      const sidenav = document.querySelector('mat-sidenav');
      if (sidenav) {
        (sidenav as any).close();
      }
    }
  }
  
  /**
   * Handle sidenav close on mobile
   */
  onSidenavClose(): void {
    // Add any additional logic when sidenav is closed
  }
  
  /**
   * Check if the current route is active
   */
  isActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      matrixParams: 'ignored',
      queryParams: 'ignored',
      fragment: 'ignored',
      // Use the correct property for exact matching
      // The second parameter is a boolean for exact match
      exact: true
    } as any);  // Using type assertion to bypass the type check
  }
}
