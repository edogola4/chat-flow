import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

import { routes } from './app.routes';
import { ThemeService } from './core/theme/theme.service';

// Factory function to initialize the theme service
export function initializeTheme(themeService: ThemeService) {
  return () => themeService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([
        // Add HTTP interceptors here if needed
      ])
    ),
    // Initialize theme service
    {
      provide: 'themeInitializer',
      useFactory: (themeService: ThemeService) => () => themeService.initialize(),
      deps: [ThemeService],
      multi: true
    },
    // Register material icons
    {
      provide: 'registerIcons',
      useFactory: (iconRegistry: MatIconRegistry, sanitizer: DomSanitizer) => {
        return () => {
          // Add any custom icons here if needed
        };
      },
      deps: [MatIconRegistry, DomSanitizer],
      multi: true
    },
    importProvidersFrom(
      // Angular Material modules
      MatButtonModule,
      MatCardModule,
      MatInputModule,
      MatFormFieldModule,
      MatIconModule,
      MatListModule,
      MatSnackBarModule,
      MatTooltipModule,
      MatMenuModule,
      MatDialogModule,
      MatProgressSpinnerModule,
      
      // Other modules
      FormsModule,
      ReactiveFormsModule
    )
  ]
};
