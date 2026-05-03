/**
 * Register Component - CloudAI Smart Storage
 * ============================================
 * REDESIGNED: Modern SaaS UI with balanced proportions
 * Inspired by Linear, Notion, Vercel design systems
 * 
 * Layout: 55% illustration / 45% form (desktop)
 * Icons: Decorative, scaled to 40-60%, low opacity
 * 
 * @author CloudAI Team
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrls: ['./register.component.css'],
  template: `
    <div class="auth-container">
      <!-- ========== LEFT PANEL - ILLUSTRATION ========== -->
      <section class="auth-illustration-panel">
        <!-- Decorative floating icons (scaled & subtle) -->
        <div class="decorative-icons">
          <!-- Star icon -->
          <div class="decorative-icon icon-star">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
          <!-- Shield icon -->
          <div class="decorative-icon icon-shield">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <!-- Document icon -->
          <div class="decorative-icon icon-document">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <!-- Checkmark icon -->
          <div class="decorative-icon icon-check">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <!-- Rocket icon -->
          <div class="decorative-icon icon-rocket">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M12.375 4.032a.75.75 0 00-.75 0l-7.5 4.33a.75.75 0 000 1.299l7.5 4.33a.75.75 0 00.75 0l7.5-4.33a.75.75 0 000-1.299l-7.5-4.33zM12 12.5l-6-3.464M12 12.5l6-3.464M12 12.5v7M6 9.036v5.928a.75.75 0 00.375.65l5.25 3.03a.75.75 0 00.75 0l5.25-3.03a.75.75 0 00.375-.65V9.036"/>
            </svg>
          </div>
        </div>

        <!-- Content -->
        <div class="illustration-content">
          <!-- Brand Logo -->
          <div class="brand-logo">
            <div class="brand-logo-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
            </div>
            <span class="brand-logo-text">CloudAI</span>
          </div>

          <!-- Headline -->
          <h1 class="illustration-headline">
            Start your journey<br>
            <span class="headline-accent">with CloudAI today.</span>
          </h1>

          <!-- Subheadline -->
          <p class="illustration-subheadline">
            Create your account and unlock the power of AI-assisted cloud storage.
          </p>

          <!-- Feature List with checkmarks -->
          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="feature-text">5 GB free storage</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="feature-text">AI-powered search & chat</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="feature-text">Support for PDF, DOCX, TXT</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <span class="feature-text">End-to-end encryption</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ========== RIGHT PANEL - FORM ========== -->
      <section class="auth-form-panel">
        <div class="form-card">
          <!-- Mobile Logo -->
          <div class="mobile-logo">
            <div class="mobile-logo-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
            </div>
            <span class="mobile-logo-text">CloudAI</span>
          </div>

          <div class="form-header">
            <h2 class="form-title">Create your account</h2>
            <p class="form-subtitle">Start securing your files in minutes</p>
          </div>

          <form (ngSubmit)="register()">
            <!-- Full Name field -->
            <div class="form-group">
              <label for="fullName" class="form-label">Full name</label>
              <input
                type="text"
                id="fullName"
                [(ngModel)]="fullName"
                name="fullName"
                class="form-input"
                placeholder="John Doe"
                [disabled]="isLoading()"
              />
            </div>

            <!-- Email field -->
            <div class="form-group">
              <label for="email" class="form-label">Email address</label>
              <div class="input-wrapper">
                <input
                  type="email"
                  id="email"
                  [(ngModel)]="email"
                  name="email"
                  class="form-input"
                  placeholder="you@example.com"
                  required
                  [disabled]="isLoading()"
                />
                <div *ngIf="email && isValidEmail()" class="input-check">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Password field -->
            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <div class="input-wrapper">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="password"
                  name="password"
                  class="form-input"
                  placeholder="At least 8 characters"
                  required
                  minlength="6"
                  [disabled]="isLoading()"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  class="input-toggle"
                >
                  <svg *ngIf="!showPassword()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <svg *ngIf="showPassword()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </button>
              </div>
              <p class="form-hint">Use 8+ characters with letters, numbers & symbols</p>
            </div>

            <!-- Confirm Password field -->
            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirm password</label>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                class="form-input"
                placeholder="••••••••"
                required
                [disabled]="isLoading()"
              />
            </div>

            <!-- Terms checkbox -->
            <div class="checkbox-row">
              <input 
                type="checkbox" 
                id="terms"
                [(ngModel)]="acceptTerms"
                name="terms"
              />
              <label for="terms">
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <!-- Password mismatch warning -->
            <div *ngIf="password && confirmPassword && password !== confirmPassword" class="form-warning">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>Passwords do not match</span>
            </div>

            <!-- Error message -->
            <div *ngIf="error()" class="form-error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{{ error() }}</span>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              class="btn-submit"
              [disabled]="isLoading() || (password !== confirmPassword) || !acceptTerms"
            >
              <span class="btn-content">
                <div *ngIf="isLoading()" class="spinner"></div>
                <span>{{ isLoading() ? 'Creating account...' : 'Create account' }}</span>
              </span>
            </button>
          </form>

          <!-- Divider -->
          <div class="form-divider">
            <span>or continue with</span>
          </div>

          <!-- Google Sign In -->
          <button class="btn-social" type="button">
            <span class="btn-content">
              <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </span>
          </button>

          <!-- Login link -->
          <p class="form-footer">
            Already have an account?
            <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </section>
    </div>
  `
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  async register(): Promise<void> {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    if (!this.acceptTerms) {
      this.error.set('Please accept the Terms of Service');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.register(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err.message || 'Registration failed');
    } finally {
      this.isLoading.set(false);
    }
  }
}
