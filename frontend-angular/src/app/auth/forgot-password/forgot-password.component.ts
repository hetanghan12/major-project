/**
 * Forgot Password Component - CloudAI
 * =====================================
 * Handles password reset requests via Firebase.
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
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrls: ['../login/login.component.css'], // Reuse login styles
  template: `
    <div class="auth-container">
      <!-- ========== LEFT PANEL - ILLUSTRATION (Same as Login) ========== -->
      <section class="auth-illustration-panel">
        <div class="decorative-icons">
          <div class="decorative-icon icon-cloud">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
            </svg>
          </div>
          <div class="decorative-icon icon-lock">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
        </div>

        <div class="illustration-content">
          <div class="brand-logo">
            <div class="brand-logo-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
            </div>
            <span class="brand-logo-text">CloudAI</span>
          </div>

          <h1 class="illustration-headline">
            Recover your account<br>
            <span class="headline-accent">in minutes.</span>
          </h1>
          <p class="illustration-subheadline">
            Simple and secure password recovery process to get you back into your cloud storage.
          </p>
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

          <!-- SUCCESS STATE -->
          <div *ngIf="isSuccess()" class="success-screen">
            <div class="form-header">
              <div class="mfa-icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); margin: 0 auto var(--space-lg); width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <svg fill="none" stroke="white" viewBox="0 0 24 24" width="32" height="32">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h2 class="form-title">Check your email</h2>
              <p class="form-subtitle">
                We sent a password reset link to <strong>{{ email }}</strong>. 
                Follow the instructions to create a new password.
              </p>
            </div>

            <button routerLink="/login" class="btn-submit">
              <span class="btn-content">Back to Login</span>
            </button>
          </div>

          <!-- FORM STATE -->
          <div *ngIf="!isSuccess()" class="forgot-form">
            <div class="form-header">
              <h2 class="form-title">Reset your password</h2>
              <p class="form-subtitle">Enter your email address and we will send you a password reset link.</p>
            </div>

            <form (ngSubmit)="onSubmit()">
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

              <!-- Error message -->
              <div *ngIf="error()" class="form-error">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ error() }}</span>
              </div>

              <button type="submit" class="btn-submit" [disabled]="isLoading()">
                <span class="btn-content">
                  <div *ngIf="isLoading()" class="spinner"></div>
                  <span>{{ isLoading() ? 'Sending...' : 'Send Reset Link' }}</span>
                </span>
              </button>
            </form>

            <p class="form-footer">
              Remember your password?
              <a routerLink="/login">Sign in</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  // Use existing styles for consistency
  styles: [`
    .success-screen {
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ForgotPasswordComponent {
  email = '';
  isLoading = signal(false);
  isSuccess = signal(false);
  error = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.email) {
      this.error.set('Please enter your email address');
      return;
    }

    if (!this.validateEmail(this.email)) {
      this.error.set('Please enter a valid email address');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.authService.sendPasswordResetEmail(this.email);
      this.isSuccess.set(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.message && err.message.includes('No account found')) {
        this.error.set('No account found with this email.');
      } else {
        this.error.set('Something went wrong. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}
