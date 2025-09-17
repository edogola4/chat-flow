import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button 
      mat-icon-button
      (click)="toggleTheme()" 
      class="theme-toggle"
      [matTooltip]="'Switch to ' + (isDarkMode() ? 'light' : 'dark') + ' theme'"
      [attr.aria-label]="'Switch to ' + (isDarkMode() ? 'light' : 'dark') + ' theme'"
    >
      <span class="theme-toggle-icon" [class.dark]="!isDarkMode()">
        <mat-icon *ngIf="!isDarkMode()">light_mode</mat-icon>
        <mat-icon *ngIf="isDarkMode()">dark_mode</mat-icon>
      </span>
      <span class="sr-only">{{ isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode' }}</span>
    </button>
  `,
  styles: [
    `
      .theme-toggle {
        color: var(--text-primary);
        transition: all 0.2s ease;
        
        &:hover {
          background-color: var(--background-secondary);
        }
        
        &:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--primary-100);
        }
      }
      
      .theme-toggle-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        
        &.dark {
          color: var(--warning);
        }
      }
      
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `
  ]
})
export class ThemeToggleComponent implements OnInit {
  private themeService = inject(ThemeService);
  isDarkMode = this.themeService.isDarkMode;

  constructor() {}

  ngOnInit(): void {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
