import { Injectable, Renderer2, RendererFactory2, inject, signal, computed } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme = signal<Theme>('light');
  private readonly THEME_KEY = 'chatflow_theme';
  private document = inject(DOCUMENT);
  private themeSubject = new BehaviorSubject<Theme>('light');
  
  // Computed signal for dark mode state
  isDarkMode = computed(() => this.currentTheme() === 'dark');

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Initialize the theme based on user preference or system preference
   */
  initialize(): void {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme | null;
    
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Check for system preference
      const prefersDark = this.window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Get the window object safely
   */
  private get window(): Window {
    return this.document.defaultView || window;
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    this.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  /**
   * Set the current theme
   * @param theme The theme to set ('light' or 'dark')
   */
  setTheme(theme: Theme): void {
    if (theme === this.currentTheme()) {
      return;
    }

    // Remove previous theme class
    this.renderer.removeClass(this.document.body, `${this.currentTheme()}-theme`);
    
    // Update current theme
    this.currentTheme.set(theme);
    this.themeSubject.next(theme);
    
    // Add new theme class
    this.renderer.addClass(this.document.body, `${theme}-theme`);
    
    // Save preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, theme);
    }
    
    // Set theme class on html element for better theming control
    const html = this.document.documentElement;
    this.renderer.setAttribute(html, 'data-theme', theme);
    
    // Dispatch event for any components that need to react to theme changes
    this.window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
  }

  /**
   * Get the current theme
   * @returns The current theme ('light' or 'dark')
   */
  getCurrentTheme(): Theme {
    return this.currentTheme();
  }

  getCurrentTheme$(): Observable<Theme> {
    return this.themeSubject.asObservable();
  }

}
