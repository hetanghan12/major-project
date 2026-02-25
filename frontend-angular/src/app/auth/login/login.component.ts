/**
 * Login Component - CloudAI Smart Storage
 * =========================================
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
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService, MfaLoginResult } from '../../core/services/auth.service';
import { MultiFactorResolver } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrls: ['./login.component.css'],
  template: `
    <div class="auth-container">
      <!-- ========== LEFT PANEL - ILLUSTRATION ========== -->
      <section class="auth-illustration-panel">
        <!-- Decorative floating icons (scaled & subtle) -->
        <div class="decorative-icons">
          <!-- Cloud icon -->
          <div class="decorative-icon icon-cloud">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
            </svg>
          </div>
          <!-- Lock icon -->
          <div class="decorative-icon icon-lock">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <!-- Sparkle icon -->
          <div class="decorative-icon icon-sparkle">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
          </div>
          <!-- Checkmark icon -->
          <div class="decorative-icon icon-check">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <!-- Lightbulb icon -->
          <div class="decorative-icon icon-bulb">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
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
            Smart Cloud Storage<br>
            <span class="headline-accent">with AI Power.</span>
          </h1>

          <!-- Subheadline -->
          <p class="illustration-subheadline">
            Upload, organize, and chat with your files using AI. 
            Everything stays secure and private.
          </p>

          <!-- Feature List -->
          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                </svg>
              </div>
              <span class="feature-text">5GB Free Cloud Storage</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              <span class="feature-text">AI-Powered Search & Chat</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <span class="feature-text">End-to-end Encryption</span>
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

          <!-- ============================================ -->
          <!-- NORMAL LOGIN FORM (Step 1) -->
          <!-- ============================================ -->
          <div *ngIf="!mfaRequired()" class="login-form">
            <div class="form-header">
              <h2 class="form-title">Welcome back</h2>
              <p class="form-subtitle">Sign in to access your cloud storage</p>
            </div>

            <form (ngSubmit)="login()">
              <!-- Email field -->
              <div class="form-group">
                <label for="email" class="form-label">Email address</label>
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
                    placeholder="••••••••"
                    required
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
              </div>

              <!-- Remember & Forgot -->
              <div class="form-options">
                <label class="checkbox-label">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <a href="#" class="forgot-link">Forgot password?</a>
              </div>

              <!-- Error message -->
              <div *ngIf="error()" class="form-error">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ error() }}</span>
              </div>

              <!-- Submit button -->
              <button type="submit" class="btn-submit" [disabled]="isLoading()">
                <span class="btn-content">
                  <div *ngIf="isLoading()" class="spinner"></div>
                  <span>{{ isLoading() ? 'Signing in...' : 'Sign in' }}</span>
                </span>
              </button>
            </form>

            <!-- Divider -->
            <div class="form-divider">
              <span>or continue with</span>
            </div>

            <!-- Demo Button -->
            <button
              (click)="fillTestCredentials(); login()"
              class="btn-demo"
              [disabled]="isLoading()"
            >
              <span class="btn-content">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Try Demo (No Login Required)</span>
              </span>
            </button>

            <!-- Google Sign In -->
            <button class="btn-social" type="button" (click)="loginWithGoogle()" [disabled]="isLoading()">
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

            <!-- Register link -->
            <p class="form-footer">
              Don't have an account?
              <a routerLink="/register">Create one</a>
            </p>
          </div>

          <!-- ============================================ -->
          <!-- MFA VERIFICATION FORM (Step 2) -->
          <!-- ============================================ -->
          <div *ngIf="mfaRequired()" class="mfa-form">
            <div class="mfa-header">
              <div class="mfa-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <h2 class="form-title">Two-Factor Authentication</h2>
              <p class="form-subtitle">Enter the 6-digit code from your authenticator app</p>
            </div>

            <form (ngSubmit)="verifyMfa()">
              <!-- MFA Code Input -->
              <div class="form-group">
                <label for="mfaCode" class="form-label">Verification Code</label>
                <input
                  type="text"
                  id="mfaCode"
                  [(ngModel)]="mfaCode"
                  name="mfaCode"
                  class="form-input mfa-input"
                  placeholder="000000"
                  maxlength="6"
                  pattern="[0-9]*"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  required
                  [disabled]="isLoading()"
                />
              </div>

              <!-- Error message -->
              <div *ngIf="error()" class="form-error">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ error() }}</span>
              </div>

              <!-- Verify button -->
              <button
                type="submit"
                class="btn-submit"
                [disabled]="isLoading() || mfaCode.length !== 6"
              >
                <span class="btn-content">
                  <div *ngIf="isLoading()" class="spinner"></div>
                  <span>{{ isLoading() ? 'Verifying...' : 'Verify & Sign In' }}</span>
                </span>
              </button>

              <!-- Back button -->
              <button
                type="button"
                (click)="cancelMfa()"
                class="btn-back"
                [disabled]="isLoading()"
              >
                <span class="btn-content">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                  <span>Back to Login</span>
                </span>
              </button>
            </form>

            <!-- Help tip -->
            <div class="mfa-tip">
              <p>
                <strong>💡 Tip:</strong> 
                Open Google Authenticator, Microsoft Authenticator, or your preferred authenticator app to get the code.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class LoginComponent {
  // Form fields
  email = '';
  password = '';
  mfaCode = '';

  // UI state
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // MFA state
  mfaRequired = signal(false);
  private mfaResolver: MultiFactorResolver | null = null;

  private returnUrl: string = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
    });
  }

  fillTestCredentials(): void {
    this.email = environment.testUser.email;
    this.password = environment.testUser.password;
  }

  /**
   * Main login method - handles both normal and MFA-enabled accounts
   */
  async login(): Promise<void> {
    if (!this.email || !this.password) {
      this.error.set('Please enter your email and password');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Use MFA-aware login
      const result: MfaLoginResult = await this.authService.loginWithMfa(this.email, this.password);

      if (result.mfaRequired && result.resolver) {
        // MFA is required - show verification form
        console.log('🔐 MFA required - showing verification screen');
        this.mfaRequired.set(true);
        this.mfaResolver = result.resolver;
        this.isLoading.set(false);
      } else if (result.user) {
        // Login successful (no MFA)
        console.log('✅ Login successful (no MFA)');
        
        // SYNC USER ROLE BEFORE REDIRECTING
        // This ensures Admins go to /admin/dashboard directly without hitting the user dashboard first
        try {
          const syncResponse = await this.authService.syncUserWithBackend();
          if (syncResponse && syncResponse.user?.role === 'Admin') {
            console.log('👨‍💼 Admin detected, redirecting to admin panel');
            this.router.navigateByUrl('/admin/dashboard');
            return;
          }
        } catch (syncError) {
          console.error('Role sync failed during login:', syncError);
        }

        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Login failed');
      this.isLoading.set(false);
    }
  }

  /**
   * Verify MFA code and complete login
   */
  async verifyMfa(): Promise<void> {
    if (!this.mfaResolver) {
      this.error.set('Session expired. Please try logging in again.');
      this.cancelMfa();
      return;
    }

    if (this.mfaCode.length !== 6) {
      this.error.set('Please enter a valid 6-digit code');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.verifyTotpDuringLogin(this.mfaResolver, this.mfaCode);
      console.log('✅ MFA verification successful');

      // SYNC USER ROLE BEFORE REDIRECTING
      try {
        const syncResponse = await this.authService.syncUserWithBackend();
        if (syncResponse && syncResponse.user?.role === 'Admin') {
          console.log('👨‍💼 Admin detected (MFA), redirecting to admin panel');
          this.router.navigateByUrl('/admin/dashboard');
          return;
        }
      } catch (syncError) {
        console.error('Role sync failed during MFA:', syncError);
      }

      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      this.error.set(err.message || 'Verification failed');
      this.mfaCode = ''; // Clear the code for retry
      this.isLoading.set(false);
    }
  }

  /**
   * Cancel MFA verification and return to login form
   */
  cancelMfa(): void {
    this.mfaRequired.set(false);
    this.mfaResolver = null;
    this.mfaCode = '';
    this.error.set(null);
    this.password = ''; // Clear password for security
  }

  /**
   * Google Login
   */
  async loginWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.loginWithGoogle();
      console.log('✅ Google login successful');

      // SYNC USER ROLE BEFORE REDIRECTING
      try {
        const syncResponse = await this.authService.syncUserWithBackend();
        if (syncResponse && syncResponse.user?.role === 'Admin') {
          console.log('👨‍💼 Admin detected (Google), redirecting to admin panel');
          this.router.navigateByUrl('/admin/dashboard');
          return;
        }
      } catch (syncError) {
        console.error('Role sync failed during Google login:', syncError);
      }

      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      console.error('Expected error if popup closed:', err);
      // Don't show generic error if user just closed the popup
      if (err.message && (err.message.includes('closed-by-user') || err.message.includes('popup-closed-by-user'))) {
        this.isLoading.set(false);
        return;
      }
      this.error.set(err.message || 'Google login failed');
      this.isLoading.set(false);
    }
  }
}
