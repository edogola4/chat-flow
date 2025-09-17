import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, RouterOutlet],
  template: `
    <div class="app-container" [class.dark-theme]="isDarkMode()">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--background-primary);
      color: var(--text-primary);
      transition: background-color 0.3s ease, color 0.3s ease;
    }
  `]
})
export class AppComponent implements OnInit {
  private themeService = inject(ThemeService);
  
  // Use the theme service's isDarkMode signal
  isDarkMode = this.themeService.isDarkMode;

  ngOnInit(): void {
    // Initialize the theme
    this.themeService.initialize();
    
    // Set initial theme class
    const currentTheme = this.themeService.getCurrentTheme();
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Listen for theme changes
    this.themeService.getCurrentTheme$().subscribe(theme => {
      document.documentElement.setAttribute('data-theme', theme);
    });
  }
}
