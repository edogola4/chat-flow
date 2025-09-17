import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ProfileService, UserProfile } from '../../services/profile.service';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup<{
    displayName: FormControl<string | null>;
    bio: FormControl<string | null>;
    phone: FormControl<string | null>;
    location: FormControl<string | null>;
    website: FormControl<string | null>;
    preferences: FormGroup<{
      theme: FormControl<'light' | 'dark' | 'system' | null>;
      notifications: FormControl<boolean | null>;
      language: FormControl<string | null>;
    }>;
    socialLinks: FormGroup<{
      twitter: FormControl<string | null>;
      github: FormControl<string | null>;
      linkedin: FormControl<string | null>;
    }>;
  }>;
  
  isSubmitting = false;
  private destroy$ = new Subject<void>();
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;
  
  // Social media platforms for the form
  socialPlatforms = [
    { value: 'twitter', display: 'Twitter', icon: 'twitter', prefix: 'https://twitter.com/' },
    { value: 'github', display: 'GitHub', icon: 'code', prefix: 'https://github.com/' },
    { value: 'linkedin', display: 'LinkedIn', icon: 'linkedin', prefix: 'https://linkedin.com/in/' }
  ];

  // Inject services
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  constructor() {
    this.profileForm = this.createProfileForm();
  }

  ngOnInit(): void {
    // Load the current profile data
    this.profileService.currentProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        if (profile) {
          this.populateForm(profile);
        }
      });
  }

  // Helper method to get social link controls in a type-safe way
  getSocialControl(platform: string): FormControl<string | null> {
    if (['twitter', 'github', 'linkedin'].includes(platform)) {
      return this.profileForm.controls.socialLinks.controls[platform as keyof typeof this.profileForm.controls.socialLinks.controls];
    }
    // Return a dummy control if platform is not valid (shouldn't happen with our setup)
    return new FormControl<string | null>(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createProfileForm() {
    return this.fb.group({
      displayName: new FormControl<string | null>('', [
        Validators.maxLength(50)
      ]),
      bio: new FormControl<string | null>('', [
        Validators.maxLength(500)
      ]),
      phone: new FormControl<string | null>('', [
        Validators.pattern(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/)
      ]),
      location: new FormControl<string | null>(''),
      website: new FormControl<string | null>('', [
        Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)
      ]),
      preferences: this.fb.group({
        theme: new FormControl<'light' | 'dark' | 'system'>('light', [
          Validators.required
        ]),
        notifications: new FormControl<boolean>(true),
        language: new FormControl<string>('en')
      }),
      socialLinks: this.fb.group({
        twitter: new FormControl<string>('', { nonNullable: false }),
        github: new FormControl<string>('', { nonNullable: false }),
        linkedin: new FormControl<string>('', { nonNullable: false })
      })
    });
  }

  private populateForm(profile: UserProfile): void {
    // Create a safe profile object with default values and proper types
    const safeProfile = {
      displayName: profile.displayName ?? null,
      bio: profile.bio ?? null,
      phone: profile.phone ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      preferences: {
        theme: (profile.preferences?.theme as 'light' | 'dark' | 'system') ?? 'light',
        notifications: profile.preferences?.notifications ?? true,
        language: profile.preferences?.language ?? 'en'
      },
      socialLinks: {
        twitter: profile.socialLinks?.twitter ?? '',
        github: profile.socialLinks?.github ?? '',
        linkedin: profile.socialLinks?.linkedin ?? ''
      }
    };

    // Use patchValue with the correct types
    this.profileForm.patchValue({
      ...safeProfile,
      preferences: {
        theme: safeProfile.preferences.theme,
        notifications: safeProfile.preferences.notifications,
        language: safeProfile.preferences.language
      },
      socialLinks: {
        twitter: safeProfile.socialLinks.twitter || null,
        github: safeProfile.socialLinks.github || null,
        linkedin: safeProfile.socialLinks.linkedin || null
      }
    });

    // Set preview URL if avatar exists
    if (profile.avatar) {
      this.previewUrl = profile.avatar;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Check file type
      if (!file.type.match('image.*')) {
        this.snackBar.open('Only image files are allowed!', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Image size should be less than 5MB', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    // You might want to add an API call to remove the avatar from the server
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    // Create a type-safe form value object
    const formValue = this.profileForm.getRawValue();
    
    // Create a clean profile update object with proper types
    const profileUpdate: Partial<UserProfile> = {
      displayName: formValue.displayName || undefined,
      bio: formValue.bio || undefined,
      phone: formValue.phone || undefined,
      location: formValue.location || undefined,
      website: formValue.website || undefined,
      preferences: formValue.preferences ? {
        theme: formValue.preferences.theme as 'light' | 'dark' | 'system',
        notifications: formValue.preferences.notifications ?? true,
        language: formValue.preferences.language || 'en'
      } : undefined,
      socialLinks: formValue.socialLinks ? {
        twitter: formValue.socialLinks.twitter || undefined,
        github: formValue.socialLinks.github || undefined,
        linkedin: formValue.socialLinks.linkedin || undefined
      } : undefined
    };

    // First update the profile
    this.profileService.updateProfile(profileUpdate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          // If a new avatar was selected, upload it
          if (this.selectedFile) {
            this.uploadAvatar(this.selectedFile);
          } else {
            this.onUpdateComplete(updatedProfile);
          }
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isSubmitting = false;
          this.snackBar.open('Failed to update profile. Please try again.', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private uploadAvatar(file: File): void {
    this.profileService.uploadProfilePicture(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.onUpdateComplete();
        },
        error: (error) => {
          console.error('Error uploading avatar:', error);
          this.isSubmitting = false;
          this.snackBar.open('Profile updated, but failed to upload avatar.', 'Close', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        }
      });
  }

  private onUpdateComplete(profile?: UserProfile): void {
    this.isSubmitting = false;
    this.snackBar.open('Profile updated successfully!', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    
    // Navigate to the profile view if not already there
    this.router.navigate(['/profile']);
  }
}
