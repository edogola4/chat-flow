import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatSlideToggleModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>Settings</mat-card-title>
        </mat-card-header>
        
        <mat-divider></mat-divider>
        
        <mat-card-content>
          <!-- Theme Settings -->
          <div class="setting-section">
            <h3>Appearance</h3>
            <mat-slide-toggle 
              [checked]="isDarkMode()" 
              (change)="toggleTheme()"
            >
              Dark Mode
            </mat-slide-toggle>
          </div>
          
          <mat-divider></mat-divider>
          
          <!-- Notification Settings -->
          <div class="setting-section">
            <h3>Notifications</h3>
            <mat-slide-toggle [checked]="true">
              Enable Notifications
            </mat-slide-toggle>
            <mat-slide-toggle [checked]="true">
              Message Sounds
            </mat-slide-toggle>
            <mat-slide-toggle [checked]="true">
              Desktop Notifications
            </mat-slide-toggle>
          </div>
          
          <mat-divider></mat-divider>
          
          <!-- Privacy Settings -->
          <div class="setting-section">
            <h3>Privacy</h3>
            <mat-slide-toggle [checked]="true">
              Show Online Status
            </mat-slide-toggle>
            <mat-slide-toggle [checked]="true">
              Show Last Seen
            </mat-slide-toggle>
            <mat-slide-toggle [checked]="false">
              Share Typing Status
            </mat-slide-toggle>
          </div>
          
          <mat-divider></mat-divider>
          
          <!-- Account Settings -->
          <div class="setting-section">
            <h3>Account</h3>
            <button mat-stroked-button color="warn">
              Logout
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    
    .settings-card {
      margin-bottom: 24px;
      overflow: hidden;
    }
    
    .setting-section {
      padding: 16px;
      
      h3 {
        margin: 0 0 16px 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--text-primary);
      }
      
      mat-slide-toggle {
        display: block;
        margin: 12px 0;
      }
      
      button {
        margin-top: 8px;
      }
    }
    
    mat-divider {
      margin: 8px 0;
    }
  `]
})
export class SettingsComponent {
  private themeService = inject(ThemeService);
  
  // Use the theme service's isDarkMode signal
  isDarkMode = this.themeService.isDarkMode;
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
