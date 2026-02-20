# 🔐 Google Authenticator 2FA Implementation Guide

## Overview

This guide explains how to add **Google Authenticator-style Two-Factor Authentication (2FA)** to the CloudAI/DocVault application. Since the project already uses **Firebase Authentication**, we'll leverage **Firebase's Multi-Factor Authentication (MFA)** with **TOTP (Time-Based One-Time Password)**.

---

## ✅ Can We Add It? **YES!**

| Requirement | Status |
|-------------|--------|
| Firebase Auth already integrated | ✅ Yes |
| Backend supports verification | ✅ Yes |
| Frontend Angular app ready | ✅ Yes |
| Firebase supports TOTP MFA | ✅ Yes (Generally Available) |

---

## 📋 Prerequisites

1. **Firebase Blaze Plan** - MFA requires the Blaze (pay-as-you-go) plan
2. **Firebase Admin SDK** - Already installed in backend
3. **Firebase JS SDK v9+** - Already using modular SDK

---

## 🏗️ Implementation Steps

### Phase 1: Enable MFA in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Build** → **Authentication** → **Sign-in method**
4. Scroll down to **Multi-factor authentication**
5. Enable **TOTP (Time-based one-time password)**
6. Click **Save**

### Phase 2: Backend Changes

#### 2.1 Install Required Package (if not already installed)
```bash
cd backend
npm install qrcode
```

#### 2.2 Create MFA Controller (`backend/controllers/mfa.controller.js`)

```javascript
/**
 * MFA Controller
 * ==============
 * Handles Multi-Factor Authentication operations with TOTP (Google Authenticator)
 */

const { getAuth } = require('../config/firebase.config');
const { asyncHandler, ApiError } = require('../middlewares/error.middleware');

/**
 * Get MFA enrollment status for current user
 * GET /api/auth/mfa/status
 */
const getMfaStatus = asyncHandler(async (req, res) => {
    const auth = getAuth();
    const { uid } = req.user;
    
    const userRecord = await auth.getUser(uid);
    
    // Check if user has TOTP enrolled
    const totpEnrolled = userRecord.multiFactor?.enrolledFactors?.some(
        factor => factor.factorId === 'totp'
    ) || false;
    
    res.json({
        success: true,
        mfaEnabled: totpEnrolled,
        enrolledFactors: userRecord.multiFactor?.enrolledFactors || []
    });
});

/**
 * Unenroll MFA for a user (Admin operation)
 * DELETE /api/auth/mfa/unenroll/:factorUid
 */
const unenrollMfa = asyncHandler(async (req, res) => {
    const auth = getAuth();
    const { uid } = req.user;
    const { factorUid } = req.params;
    
    // Get current user record
    const userRecord = await auth.getUser(uid);
    
    // Find and verify the factor belongs to user
    const factor = userRecord.multiFactor?.enrolledFactors?.find(
        f => f.uid === factorUid
    );
    
    if (!factor) {
        throw new ApiError(404, 'MFA factor not found');
    }
    
    // Remove the MFA factor
    await auth.updateUser(uid, {
        multiFactor: {
            enrolledFactors: userRecord.multiFactor.enrolledFactors.filter(
                f => f.uid !== factorUid
            )
        }
    });
    
    res.json({
        success: true,
        message: 'MFA factor removed successfully'
    });
});

module.exports = {
    getMfaStatus,
    unenrollMfa
};
```

#### 2.3 Create MFA Routes (`backend/routes/mfa.routes.js`)

```javascript
/**
 * MFA Routes
 * ==========
 * Routes for Multi-Factor Authentication management
 */

const express = require('express');
const router = express.Router();
const { getMfaStatus, unenrollMfa } = require('../controllers/mfa.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(verifyFirebaseToken);

/**
 * @route   GET /api/auth/mfa/status
 * @desc    Get MFA enrollment status
 * @access  Protected
 */
router.get('/status', getMfaStatus);

/**
 * @route   DELETE /api/auth/mfa/unenroll/:factorUid
 * @desc    Unenroll a specific MFA factor
 * @access  Protected
 */
router.delete('/unenroll/:factorUid', unenrollMfa);

module.exports = router;
```

#### 2.4 Register Routes in `server.js`

Add to your `server.js`:

```javascript
// MFA Routes
const mfaRoutes = require('./routes/mfa.routes');
app.use('/api/auth/mfa', mfaRoutes);
```

---

### Phase 3: Frontend Changes

#### 3.1 Update Auth Service (`frontend-angular/src/app/core/services/auth.service.ts`)

Add the following imports and methods:

```typescript
import {
    // ... existing imports ...
    multiFactor,
    TotpMultiFactorGenerator,
    TotpSecret,
    getMultiFactorResolver,
    MultiFactorResolver,
    MultiFactorError
} from 'firebase/auth';

// Add to AuthService class:

/**
 * Check if current user has MFA enabled
 */
async checkMfaStatus(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;
    
    const mfaInfo = multiFactor(user);
    return mfaInfo.enrolledFactors.length > 0;
}

/**
 * Start TOTP enrollment - returns QR code URL
 */
async startTotpEnrollment(): Promise<{ qrCodeUrl: string; secret: TotpSecret }> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const mfaSession = await multiFactor(user).getSession();
    const totpSecret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
    
    // Generate QR code URL for Google Authenticator
    const qrCodeUrl = totpSecret.generateQrCodeUrl(
        user.email || 'User',
        'CloudAI Document Vault'
    );
    
    return { qrCodeUrl, secret: totpSecret };
}

/**
 * Complete TOTP enrollment with verification code
 */
async completeTotpEnrollment(secret: TotpSecret, verificationCode: string, displayName: string = 'Google Authenticator'): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    // Generate multi-factor assertion
    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
        secret,
        verificationCode
    );
    
    // Enroll the TOTP factor
    await multiFactor(user).enroll(multiFactorAssertion, displayName);
}

/**
 * Verify TOTP during login (when MFA is required)
 */
async verifyTotpDuringLogin(resolver: MultiFactorResolver, verificationCode: string): Promise<AppUser> {
    // Find TOTP hint
    const totpHint = resolver.hints.find(hint => hint.factorId === 'totp');
    
    if (!totpHint) {
        throw new Error('TOTP factor not found');
    }
    
    const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
        totpHint.uid,
        verificationCode
    );
    
    const credential = await resolver.resolveSignIn(multiFactorAssertion);
    const user = this.mapFirebaseUser(credential.user);
    this._currentUser.set(user);
    return user;
}

/**
 * Get enrolled MFA factors
 */
getEnrolledFactors(): Array<{ uid: string; displayName: string | null; factorId: string }> {
    const user = this.auth.currentUser;
    if (!user) return [];
    
    return multiFactor(user).enrolledFactors.map(factor => ({
        uid: factor.uid,
        displayName: factor.displayName,
        factorId: factor.factorId
    }));
}

/**
 * Unenroll a specific MFA factor
 */
async unenrollMfa(factorUid: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const mfaInfo = multiFactor(user);
    const factor = mfaInfo.enrolledFactors.find(f => f.uid === factorUid);
    
    if (!factor) {
        throw new Error('MFA factor not found');
    }
    
    await mfaInfo.unenroll(factor);
}

/**
 * Updated login method to handle MFA
 */
async loginWithMfa(email: string, password: string): Promise<AppUser | { mfaRequired: true; resolver: MultiFactorResolver }> {
    try {
        const credential = await signInWithEmailAndPassword(this.auth, email, password);
        const user = this.mapFirebaseUser(credential.user);
        this._currentUser.set(user);
        return user;
    } catch (error: any) {
        // Check if MFA is required
        if (error.code === 'auth/multi-factor-auth-required') {
            const resolver = getMultiFactorResolver(this.auth, error as MultiFactorError);
            return { mfaRequired: true, resolver };
        }
        throw this.handleAuthError(error);
    }
}
```

#### 3.2 Create MFA Setup Component

Create `frontend-angular/src/app/settings/mfa-setup/mfa-setup.component.ts`:

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TotpSecret } from 'firebase/auth';

@Component({
    selector: 'app-mfa-setup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './mfa-setup.component.html',
    styleUrls: ['./mfa-setup.component.css']
})
export class MfaSetupComponent {
    step = signal<'check' | 'setup' | 'verify' | 'done'>('check');
    qrCodeUrl = signal<string>('');
    verificationCode = '';
    error = signal<string>('');
    loading = signal<boolean>(false);
    mfaEnabled = signal<boolean>(false);
    enrolledFactors = signal<any[]>([]);
    
    private totpSecret: TotpSecret | null = null;
    
    constructor(private authService: AuthService) {
        this.checkMfaStatus();
    }
    
    async checkMfaStatus() {
        this.loading.set(true);
        try {
            this.mfaEnabled.set(await this.authService.checkMfaStatus());
            this.enrolledFactors.set(this.authService.getEnrolledFactors());
        } catch (error: any) {
            this.error.set(error.message);
        }
        this.loading.set(false);
    }
    
    async startSetup() {
        this.loading.set(true);
        this.error.set('');
        try {
            const { qrCodeUrl, secret } = await this.authService.startTotpEnrollment();
            this.qrCodeUrl.set(qrCodeUrl);
            this.totpSecret = secret;
            this.step.set('setup');
        } catch (error: any) {
            this.error.set(error.message);
        }
        this.loading.set(false);
    }
    
    async verifyAndComplete() {
        if (!this.totpSecret || !this.verificationCode) {
            this.error.set('Please enter the verification code');
            return;
        }
        
        this.loading.set(true);
        this.error.set('');
        try {
            await this.authService.completeTotpEnrollment(
                this.totpSecret,
                this.verificationCode
            );
            this.step.set('done');
            this.mfaEnabled.set(true);
            await this.checkMfaStatus();
        } catch (error: any) {
            this.error.set('Invalid verification code. Please try again.');
        }
        this.loading.set(false);
    }
    
    async disableMfa(factorUid: string) {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            return;
        }
        
        this.loading.set(true);
        try {
            await this.authService.unenrollMfa(factorUid);
            await this.checkMfaStatus();
        } catch (error: any) {
            this.error.set(error.message);
        }
        this.loading.set(false);
    }
}
```

#### 3.3 Create MFA Setup Template

Create `frontend-angular/src/app/settings/mfa-setup/mfa-setup.component.html`:

```html
<div class="mfa-container">
    <h2>🔐 Two-Factor Authentication</h2>
    
    <!-- Loading State -->
    <div *ngIf="loading()" class="loading">
        <span class="spinner"></span> Loading...
    </div>
    
    <!-- Error Display -->
    <div *ngIf="error()" class="error-message">
        {{ error() }}
    </div>
    
    <!-- MFA Status Check -->
    <div *ngIf="step() === 'check' && !loading()">
        <div *ngIf="mfaEnabled()">
            <p class="status enabled">✅ Two-Factor Authentication is ENABLED</p>
            
            <div class="enrolled-factors">
                <h3>Enrolled Authenticators:</h3>
                <div *ngFor="let factor of enrolledFactors()" class="factor-item">
                    <span>{{ factor.displayName || 'Authenticator App' }}</span>
                    <button (click)="disableMfa(factor.uid)" class="btn-danger">Remove</button>
                </div>
            </div>
        </div>
        
        <div *ngIf="!mfaEnabled()">
            <p class="status disabled">⚠️ Two-Factor Authentication is NOT enabled</p>
            <p>Add an extra layer of security to your account by enabling 2FA with Google Authenticator or any compatible app.</p>
            <button (click)="startSetup()" class="btn-primary">Enable 2FA</button>
        </div>
    </div>
    
    <!-- Setup Step: Show QR Code -->
    <div *ngIf="step() === 'setup'">
        <h3>Step 1: Scan QR Code</h3>
        <p>Open Google Authenticator (or any TOTP app) and scan this QR code:</p>
        
        <div class="qr-container">
            <img [src]="qrCodeUrl()" alt="2FA QR Code" class="qr-code" />
        </div>
        
        <h3>Step 2: Enter Verification Code</h3>
        <p>Enter the 6-digit code from your authenticator app:</p>
        
        <input 
            type="text" 
            [(ngModel)]="verificationCode"
            placeholder="000000"
            maxlength="6"
            class="code-input"
        />
        
        <div class="button-group">
            <button (click)="step.set('check')" class="btn-secondary">Cancel</button>
            <button (click)="verifyAndComplete()" class="btn-primary" [disabled]="verificationCode.length !== 6">
                Verify & Enable
            </button>
        </div>
    </div>
    
    <!-- Done Step -->
    <div *ngIf="step() === 'done'">
        <div class="success-message">
            <h3>🎉 2FA Enabled Successfully!</h3>
            <p>Your account is now protected with Two-Factor Authentication.</p>
            <p>You'll need to enter a code from your authenticator app each time you log in.</p>
            <button (click)="step.set('check')" class="btn-primary">Done</button>
        </div>
    </div>
</div>
```

#### 3.4 Update Login Component to Handle MFA

Modify `frontend-angular/src/app/login/login.component.ts`:

```typescript
// Add these properties
mfaRequired = signal<boolean>(false);
mfaResolver: MultiFactorResolver | null = null;
mfaCode = '';

// Update the login method
async onLogin() {
    const result = await this.authService.loginWithMfa(this.email, this.password);
    
    if ('mfaRequired' in result && result.mfaRequired) {
        // MFA is required
        this.mfaRequired.set(true);
        this.mfaResolver = result.resolver;
    } else {
        // Login successful
        this.router.navigate(['/dashboard']);
    }
}

// Add method for MFA verification
async verifyMfaCode() {
    if (!this.mfaResolver) return;
    
    try {
        await this.authService.verifyTotpDuringLogin(this.mfaResolver, this.mfaCode);
        this.router.navigate(['/dashboard']);
    } catch (error: any) {
        this.error = 'Invalid verification code';
    }
}
```

---

## 📁 File Structure Summary

```
backend/
├── controllers/
│   └── mfa.controller.js       # NEW - MFA operations
├── routes/
│   └── mfa.routes.js           # NEW - MFA endpoints
└── server.js                   # MODIFIED - Add MFA routes

frontend-angular/
├── src/app/
│   ├── core/services/
│   │   └── auth.service.ts     # MODIFIED - Add MFA methods
│   ├── login/
│   │   └── login.component.ts  # MODIFIED - Handle MFA during login
│   └── settings/
│       └── mfa-setup/          # NEW - MFA setup component
│           ├── mfa-setup.component.ts
│           ├── mfa-setup.component.html
│           └── mfa-setup.component.css
```

---

## 🔑 Key Points

1. **Firebase Blaze Plan Required** - MFA features require a paid Firebase plan
2. **TOTP Standard** - Works with Google Authenticator, Authy, Microsoft Authenticator, etc.
3. **Recovery Codes** - Consider implementing backup/recovery codes for users who lose access to their authenticator app
4. **Email Verification** - It's recommended to require email verification before enabling MFA

---

## 🧪 Testing

1. Enable MFA in Firebase Console
2. Login to the app
3. Navigate to Settings → Two-Factor Authentication
4. Click "Enable 2FA"
5. Scan QR code with Google Authenticator
6. Enter verification code
7. Log out and log back in - you should be prompted for MFA code

---

## 📚 References

- [Firebase Multi-Factor Authentication Documentation](https://firebase.google.com/docs/auth/web/multi-factor)
- [TOTP MFA with Firebase](https://firebase.google.com/docs/auth/web/totp-mfa)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)

---

## ⏱️ Estimated Implementation Time

| Phase | Time Estimate |
|-------|---------------|
| Firebase Console Setup | 10 minutes |
| Backend Changes | 30 minutes |
| Frontend Changes | 2-3 hours |
| Testing | 1 hour |
| **Total** | **4-5 hours** |

---

*Created: January 29, 2026*
*Project: CloudAI Document Vault*
