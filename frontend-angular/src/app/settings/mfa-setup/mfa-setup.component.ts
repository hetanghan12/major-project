/**
 * MFA Setup Component - CloudAI Smart Storage
 * =============================================
 * Allows users to enable/disable Two-Factor Authentication.
 * Uses Google Authenticator compatible TOTP.
 * 
 * Flow:
 * 1. Check if MFA is already enabled
 * 2. If not, generate QR code for user to scan
 * 3. User enters verification code to confirm
 * 4. MFA is enabled!
 * 
 * @author CloudAI Team
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, EnrolledFactor } from '../../core/services/auth.service';
import { TotpSecret } from 'firebase/auth';

type SetupStep = 'check' | 'setup' | 'verify' | 'done';

@Component({
    selector: 'app-mfa-setup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="mfa-container">
      <!-- Header -->
      <div class="mfa-header">
        <div class="mfa-header-icon">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <div>
          <h2 class="mfa-title">Two-Factor Authentication</h2>
          <p class="mfa-subtitle">Add an extra layer of security to your account</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="mfa-loading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>

      <!-- Error Display -->
      <div *ngIf="error()" class="mfa-error">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ error() }}</span>
        <button (click)="error.set(null)" class="ml-auto">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- ============================================ -->
      <!-- STEP: CHECK STATUS -->
      <!-- ============================================ -->
      <div *ngIf="step() === 'check' && !loading()" class="mfa-step">
        
        <!-- MFA Enabled State -->
        <div *ngIf="mfaEnabled()" class="mfa-status-enabled">
          <div class="mfa-status-badge enabled">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span>Two-Factor Authentication is ENABLED</span>
          </div>

          <p class="mfa-description">
            Your account is protected with two-factor authentication. 
            You'll need to enter a code from your authenticator app when logging in.
          </p>

          <!-- Enrolled Factors List -->
          <div class="mfa-factors">
            <h3 class="mfa-factors-title">Enrolled Authenticators</h3>
            <div *ngFor="let factor of enrolledFactors()" class="mfa-factor-item">
              <div class="mfa-factor-icon">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </div>
              <div class="mfa-factor-info">
                <span class="mfa-factor-name">{{ factor.displayName || 'Authenticator App' }}</span>
                <span class="mfa-factor-type">TOTP</span>
              </div>
              <button (click)="disableMfa(factor.uid)" class="btn-danger-outline" [disabled]="loading()">
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- MFA Disabled State -->
        <div *ngIf="!mfaEnabled()" class="mfa-status-disabled">
          <div class="mfa-status-badge disabled">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>Two-Factor Authentication is NOT enabled</span>
          </div>

          <p class="mfa-description">
            Protect your account with two-factor authentication. 
            Use Google Authenticator, Microsoft Authenticator, Authy, or any compatible TOTP app.
          </p>

          <!-- Benefits -->
          <div class="mfa-benefits">
            <div class="mfa-benefit">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Protects against password theft</span>
            </div>
            <div class="mfa-benefit">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Time-based codes that expire in 30 seconds</span>
            </div>
            <div class="mfa-benefit">
              <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>Works offline - no internet needed for codes</span>
            </div>
          </div>

          <button (click)="startSetup()" class="btn-primary w-full h-12" [disabled]="loading()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Enable Two-Factor Authentication
          </button>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- STEP: SETUP (Show QR Code) -->
      <!-- ============================================ -->
      <div *ngIf="step() === 'setup'" class="mfa-step">
        <div class="mfa-setup-steps">
          <div class="mfa-setup-step active">
            <span class="step-number">1</span>
            <span class="step-label">Scan QR Code</span>
          </div>
          <div class="step-connector"></div>
          <div class="mfa-setup-step">
            <span class="step-number">2</span>
            <span class="step-label">Verify Code</span>
          </div>
        </div>

        <div class="mfa-qr-section">
          <h3 class="mfa-section-title">Step 1: Scan this QR Code</h3>
          <p class="mfa-section-description">
            Open your authenticator app and scan this QR code to add your account.
          </p>

          <div class="mfa-qr-container">
            <img [src]="qrCodeUrl()" alt="2FA QR Code" class="mfa-qr-code" />
          </div>

          <div class="mfa-app-suggestions">
            <span>Recommended apps:</span>
            <div class="flex gap-2 justify-center mt-2">
              <span class="app-badge">Google Authenticator</span>
              <span class="app-badge">Microsoft Authenticator</span>
              <span class="app-badge">Authy</span>
            </div>
          </div>
        </div>

        <button (click)="step.set('verify')" class="btn-primary w-full h-12">
          I've Scanned the QR Code
        </button>
        
        <button (click)="cancelSetup()" class="btn-secondary w-full h-12 mt-3">
          Cancel Setup
        </button>
      </div>

      <!-- ============================================ -->
      <!-- STEP: VERIFY (Enter Code) -->
      <!-- ============================================ -->
      <div *ngIf="step() === 'verify'" class="mfa-step">
        <div class="mfa-setup-steps">
          <div class="mfa-setup-step completed">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span class="step-label">QR Scanned</span>
          </div>
          <div class="step-connector active"></div>
          <div class="mfa-setup-step active">
            <span class="step-number">2</span>
            <span class="step-label">Verify Code</span>
          </div>
        </div>

        <div class="mfa-verify-section">
          <h3 class="mfa-section-title">Step 2: Enter Verification Code</h3>
          <p class="mfa-section-description">
            Enter the 6-digit code from your authenticator app to complete setup.
          </p>

          <div class="mfa-code-input-container">
            <input
              type="text"
              [(ngModel)]="verificationCode"
              placeholder="000000"
              maxlength="6"
              pattern="[0-9]*"
              inputmode="numeric"
              autocomplete="one-time-code"
              class="mfa-code-input"
              [disabled]="loading()"
            />
          </div>
        </div>

        <button 
          (click)="verifyAndComplete()" 
          class="btn-primary w-full h-12"
          [disabled]="loading() || verificationCode.length !== 6"
        >
          <div *ngIf="loading()" class="spinner w-5 h-5"></div>
          <span *ngIf="!loading()">Verify & Enable 2FA</span>
          <span *ngIf="loading()">Verifying...</span>
        </button>
        
        <button (click)="step.set('setup')" class="btn-secondary w-full h-12 mt-3" [disabled]="loading()">
          Back to QR Code
        </button>
      </div>

      <!-- ============================================ -->
      <!-- STEP: DONE (Success) -->
      <!-- ============================================ -->
      <div *ngIf="step() === 'done'" class="mfa-step">
        <div class="mfa-success">
          <div class="mfa-success-icon">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          
          <h3 class="mfa-success-title">🎉 2FA Enabled Successfully!</h3>
          <p class="mfa-success-description">
            Your account is now protected with Two-Factor Authentication.
            You'll need to enter a code from your authenticator app each time you log in.
          </p>

          <div class="mfa-success-tips">
            <h4>Important Tips:</h4>
            <ul>
              <li>Keep your authenticator app installed on your phone</li>
              <li>If you get a new phone, you'll need to transfer your app or contact support</li>
              <li>Consider adding backup recovery options in settings</li>
            </ul>
          </div>

          <button (click)="step.set('check'); checkMfaStatus()" class="btn-primary w-full h-12">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .mfa-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 2rem;
    }

    .mfa-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .mfa-header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .mfa-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .mfa-subtitle {
      color: var(--text-muted);
      margin: 0.25rem 0 0;
    }

    .mfa-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--text-muted);
    }

    .mfa-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 12px;
      background: var(--danger-bg);
      color: var(--danger);
      margin-bottom: 1.5rem;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .mfa-step {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mfa-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .mfa-status-badge.enabled {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .mfa-status-badge.disabled {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .mfa-description {
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .mfa-factors {
      margin: 1.5rem 0;
    }

    .mfa-factors-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mfa-factor-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
    }

    .mfa-factor-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mfa-factor-info {
      flex: 1;
    }

    .mfa-factor-name {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
    }

    .mfa-factor-type {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .mfa-benefits {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 1.5rem 0;
    }

    .mfa-benefit {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary);
    }

    .mfa-setup-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 2rem;
    }

    .mfa-setup-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-secondary);
      border: 2px solid var(--border-color);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .mfa-setup-step.active .step-number {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    .mfa-setup-step.completed {
      color: #22c55e;
    }

    .mfa-setup-step.completed svg {
      width: 32px;
      height: 32px;
      background: #22c55e;
      border-radius: 50%;
      padding: 6px;
      color: white;
    }

    .step-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .mfa-setup-step.active .step-label {
      color: var(--primary);
      font-weight: 600;
    }

    .step-connector {
      width: 60px;
      height: 2px;
      background: var(--border-color);
      margin: 0 0.5rem;
      margin-bottom: 1.25rem;
    }

    .step-connector.active {
      background: #22c55e;
    }

    .mfa-section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .mfa-section-description {
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    .mfa-qr-container {
      display: flex;
      justify-content: center;
      padding: 1.5rem;
      background: white;
      border-radius: 16px;
      margin-bottom: 1rem;
      border: 1px solid var(--border-color);
    }

    .mfa-qr-code {
      width: 200px;
      height: 200px;
      border-radius: 8px;
    }

    .mfa-app-suggestions {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .app-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--bg-secondary);
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .mfa-code-input-container {
      display: flex;
      justify-content: center;
      margin: 1.5rem 0;
    }

    .mfa-code-input {
      width: 100%;
      max-width: 200px;
      text-align: center;
      font-size: 2rem;
      font-family: monospace;
      letter-spacing: 0.5em;
      padding: 1rem;
      border-radius: 12px;
      border: 2px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-primary);
      transition: all 0.2s ease;
    }

    .mfa-code-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .mfa-success {
      text-align: center;
      padding: 2rem 0;
    }

    .mfa-success-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }

    .mfa-success-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .mfa-success-description {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .mfa-success-tips {
      text-align: left;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }

    .mfa-success-tips h4 {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .mfa-success-tips ul {
      margin: 0;
      padding-left: 1.5rem;
      color: var(--text-secondary);
    }

    .mfa-success-tips li {
      margin-bottom: 0.25rem;
    }

    .btn-danger-outline {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--danger);
      background: transparent;
      color: var(--danger);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-danger-outline:hover:not(:disabled) {
      background: var(--danger);
      color: white;
    }

    .btn-danger-outline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class MfaSetupComponent implements OnInit {
    // State
    step = signal<SetupStep>('check');
    qrCodeUrl = signal<string>('');
    verificationCode = '';
    error = signal<string | null>(null);
    loading = signal<boolean>(false);
    mfaEnabled = signal<boolean>(false);
    enrolledFactors = signal<EnrolledFactor[]>([]);

    // Private
    private totpSecret: TotpSecret | null = null;

    constructor(private authService: AuthService) { }

    ngOnInit(): void {
        this.checkMfaStatus();
    }

    /**
     * Check current MFA status
     */
    async checkMfaStatus(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            const enabled = await this.authService.checkMfaStatus();
            this.mfaEnabled.set(enabled);
            this.enrolledFactors.set(this.authService.getEnrolledFactors());
            console.log(`📱 MFA Status: ${enabled ? 'Enabled' : 'Disabled'}`);
        } catch (err: any) {
            console.error('Failed to check MFA status:', err);
            this.error.set(err.message || 'Failed to check MFA status');
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Start the MFA enrollment process
     */
    async startSetup(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            const result = await this.authService.startTotpEnrollment();
            this.qrCodeUrl.set(result.qrCodeUrl);
            this.totpSecret = result.secret;
            this.step.set('setup');
            console.log('🔐 MFA setup started - QR code generated');
        } catch (err: any) {
            console.error('Failed to start MFA setup:', err);
            this.error.set(err.message || 'Failed to start 2FA setup');
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Verify code and complete enrollment
     */
    async verifyAndComplete(): Promise<void> {
        if (!this.totpSecret || !this.verificationCode) {
            this.error.set('Please enter the verification code');
            return;
        }

        if (this.verificationCode.length !== 6) {
            this.error.set('Please enter a valid 6-digit code');
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        try {
            await this.authService.completeTotpEnrollment(
                this.totpSecret,
                this.verificationCode
            );
            this.step.set('done');
            this.mfaEnabled.set(true);
            console.log('✅ MFA enrollment completed');
        } catch (err: any) {
            console.error('MFA verification failed:', err);
            this.error.set(err.message || 'Invalid verification code. Please try again.');
            this.verificationCode = ''; // Clear for retry
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Disable MFA for a specific factor
     */
    async disableMfa(factorUid: string): Promise<void> {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);

        try {
            await this.authService.unenrollMfa(factorUid);
            await this.checkMfaStatus();
            console.log('🗑️ MFA disabled');
        } catch (err: any) {
            console.error('Failed to disable MFA:', err);
            this.error.set(err.message || 'Failed to disable 2FA');
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Cancel setup and return to check step
     */
    cancelSetup(): void {
        this.step.set('check');
        this.qrCodeUrl.set('');
        this.verificationCode = '';
        this.totpSecret = null;
        this.error.set(null);
    }
}
