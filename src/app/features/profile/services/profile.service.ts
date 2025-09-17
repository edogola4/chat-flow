import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../../../core/auth/auth.service';

export interface UserProfile extends User {
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    language: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = '/api/profile';
  private currentProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  
  // Public observable for the current user's profile
  currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Load the current user's profile
  loadProfile(): Observable<UserProfile | null> {
    // In a real app, this would be an HTTP request
    // For now, return a mock profile
    const mockProfile: UserProfile = {
      id: 'user-123',
      username: 'brandon',
      email: 'brandon@example.com',
      displayName: 'Bran Don',
      bio: 'Software Developer | Angular Enthusiast',
      status: 'online',
      lastSeen: new Date(),
      isEmailVerified: true,
      createdAt: new Date('2023-01-01'),
      socialLinks: {
        twitter: 'https://twitter.com/brandon',
        github: 'https://github.com/brandon',
        linkedin: 'https://linkedin.com/in/brandon'
      }
    };

    return of(mockProfile).pipe(
      tap(profile => this.currentProfileSubject.next(profile)),
      catchError(error => {
        console.error('Failed to load profile', error);
        this.currentProfileSubject.next(null);
        return of(null);
      })
    );
  }

  // Update the current user's profile
  updateProfile(updates: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, updates).pipe(
      tap(updatedProfile => {
        const current = this.currentProfileSubject.value;
        this.currentProfileSubject.next({ ...current, ...updatedProfile });
      })
    );
  }

  // Upload a new profile picture
  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return this.http.post<{ url: string }>(`${this.apiUrl}/me/avatar`, formData).pipe(
      tap(({ url }) => {
        const current = this.currentProfileSubject.value;
        if (current) {
          this.currentProfileSubject.next({ ...current, avatar: url });
        }
      })
    );
  }

  // Get a user's public profile
  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/user/${userId}`);
  }

  // Update user preferences
  updatePreferences(preferences: Partial<UserProfile['preferences']>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/preferences`, { preferences }).pipe(
      tap(updatedProfile => {
        const current = this.currentProfileSubject.value;
        this.currentProfileSubject.next({ ...current, ...updatedProfile });
      })
    );
  }
}
