import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private router: Router) {
    this.initializeUser();
  }

  private initializeUser(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      // In a real app, you would validate the token here
      // and fetch the user from your backend
      const user = this.getUserFromToken(token);
      if (user) {
        this.currentUserSubject.next(user);
      } else {
        this.logout();
      }
    }
  }

  login(username: string, password: string): Observable<boolean> {
    // In a real app, you would make an HTTP request to your backend
    return of(true).pipe(
      map(() => {
        // Simulate API call
        const user: User = {
          id: 'user-' + Math.random().toString(36).substr(2, 9),
          username,
          email: `${username}@example.com`,
          status: 'online',
          lastSeen: new Date()
        };
        
        // Generate a mock token
        const token = btoa(JSON.stringify(user));
        localStorage.setItem(this.TOKEN_KEY, token);
        this.currentUserSubject.next(user);
        return true;
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => new Error('Login failed'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private getUserFromToken(token: string): User | null {
    try {
      const userData = JSON.parse(atob(token));
      return {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        status: userData.status || 'offline',
        lastSeen: userData.lastSeen ? new Date(userData.lastSeen) : new Date()
      };
    } catch (e) {
      console.error('Invalid token');
      return null;
    }
  }

  updateUserStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, status };
      this.currentUserSubject.next(updatedUser);
      // In a real app, you would update the status on the server
    }
  }
}
