import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, Subject } from 'rxjs';
import { catchError, filter, map, switchMap, tap, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { WebsocketService, WebSocketMessage } from './websocket.service';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  token?: string;
  bio?: string;
  phone?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private apiUrl = '/api/auth';
  private destroy$ = new Subject<void>();
  private tokenExpirationTimer: any;
  private readonly TOKEN_KEY = 'auth_token';
  
  // Inject services
  private router = inject(Router);
  private http = inject(HttpClient);
  private websocketService = inject(WebsocketService);
  
  // Track authentication state (using the existing isAuthenticated$ observable)
  
  // Public observables
  currentUser$ = this.currentUserSubject.asObservable();
  isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  // Initialize the service
  constructor() {
    this.initializeAuth();
    this.setupWebSocketHandlers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
  }

  private initializeAuth(): void {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (token && userData) {
      const user = JSON.parse(userData);
      this.currentUserSubject.next(user);
      this.setAuthTimer(3600 * 1000); // 1 hour token expiration
      
      // Update user status to online
      this.updateUserStatus('online').subscribe();
    }
  }
  
  private setupWebSocketHandlers(): void {
    // Listen for authentication-related WebSocket events
    this.websocketService.messages$.pipe(
      takeUntil(this.destroy$),
      filter((msg: any) => msg.type === 'USER_STATUS_CHANGED' || msg.type === 'PROFILE_UPDATED')
    ).subscribe({
      next: (message: any) => {
        if (message.type === 'USER_STATUS_CHANGED' && message.data?.userId === this.currentUserSubject.value?.id) {
          this.updateLocalUser({ status: message.data.status });
        } else if (message.type === 'PROFILE_UPDATED' && message.data?.userId === this.currentUserSubject.value?.id) {
          this.updateLocalUser(message.data.updates);
        }
      },
      error: (error: any) => console.error('Error in auth WebSocket handler:', error)
    });
  }
  
  private updateLocalUser(updates: Partial<User>): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.currentUserSubject.next(updatedUser);
      this.saveUserToStorage(updatedUser);
    }
  }
  
  private saveUserToStorage(user: User): void {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
  
  private setAuthTimer(expiresIn: number): void {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expiresIn);
  }
  
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  get token(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Authentication methods
  login(credentials: { email: string; password: string }): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthentication(response)),
      switchMap((response: LoginResponse) => {
        // After successful login, authenticate WebSocket
        return this.websocketService.authenticate(
          response.user.id,
          response.user.username,
          response.user.email,
          response.user.avatar
        ).pipe(
          map(success => {
            if (!success) {
              console.warn('WebSocket authentication failed, but login was successful');
            }
            return response.user;
          })
        );
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => new Error('Login failed. Please check your credentials.'));
      })
    );
  }

  register(userData: { username: string; email: string; password: string }): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap(response => this.handleAuthentication(response)),
      map(response => response.user),
      catchError(error => {
        console.error('Registration failed:', error);
        return throwError(() => new Error('Registration failed. Please try again.'));
      })
    );
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, updates).pipe(
      tap(updatedUser => {
        this.currentUserSubject.next(updatedUser);
        this.saveUserToStorage(updatedUser);
      })
    );
  }

  updateUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): Observable<void> {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.updateLocalUser({ status });
    }
    return of(undefined);
  }

  private handleAuthentication(response: LoginResponse): void {
    const { user, token, expiresIn } = response;
    
    // Set the token in local storage
    localStorage.setItem('auth_token', token);
    
    // Update user data
    this.currentUserSubject.next(user);
    this.saveUserToStorage(user);
    
    // Set auto logout
    this.setAuthTimer(expiresIn * 1000);
    
    // Update user status to online
    this.updateUserStatus('online').subscribe();
  }

  private clearAuthData(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    this.currentUserSubject.next(null);
    
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getUserFromToken(token: string): User | null {
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        avatar: payload.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.username)}`,
        status: 'online',
        isEmailVerified: payload.email_verified || false,
        lastSeen: new Date(),
        createdAt: new Date(payload.iat * 1000),
        updatedAt: new Date(payload.iat * 1000)
      };
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }
}
