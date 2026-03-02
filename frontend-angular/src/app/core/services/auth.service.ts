/**
 * Authentication Service
 * ========================
 * Handles Firebase Authentication operations including MFA (Multi-Factor Authentication).
 * 
 * @author CloudAI Team
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    Auth,
    multiFactor,
    TotpMultiFactorGenerator,
    TotpSecret,
    getMultiFactorResolver,
    MultiFactorResolver,
    MultiFactorError,
    MultiFactorInfo,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

// User interface
export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    role?: string;
}

// Backend Response interface
export interface BackendUserSyncResponse {
    success: boolean;
    message: string;
    user: {
        userId: string;
        email: string;
        displayName: string | null;
        photoURL: string | null;
        role: string;
        createdAt: string;
        updatedAt: string;
    };
}

// MFA-related interfaces
export interface MfaEnrollmentResult {
    qrCodeUrl: string;
    secret: TotpSecret;
}

export interface MfaLoginResult {
    user?: AppUser;
    mfaRequired?: boolean;
    resolver?: MultiFactorResolver;
}

export interface EnrolledFactor {
    uid: string;
    displayName: string | null;
    factorId: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private auth: Auth;
    private _currentUser = signal<AppUser | null>(null);
    private _isLoading = signal<boolean>(true);
    private _token = signal<string | null>(null);

    // Public computed values
    readonly currentUser = computed(() => this._currentUser());
    readonly isLoading = computed(() => this._isLoading());

    constructor(private http: HttpClient) {
        // Initialize Firebase
        const app = initializeApp(environment.firebase);
        this.auth = getAuth(app);

        // Listen to auth state changes
        this.setupAuthListener();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this._currentUser() !== null;
    }

    /**
     * Get current auth token
     */
    async getToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (user) {
            return await user.getIdToken();
        }
        return null;
    }

    /**
     * Check auth state on app init
     */
    checkAuthState(): void {
        // Auth listener handles this
    }

    /**
     * Setup Firebase auth state listener
     */
    private setupAuthListener(): void {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                const appUser = this.mapFirebaseUser(user);
                this._currentUser.set(appUser);
                this._token.set(await user.getIdToken());

                // Sync with backend to get extra fields like 'role'
                try {
                    const response = await this.syncUserWithBackend();
                    if (response && response.success) {
                        this._currentUser.set({
                            ...appUser,
                            role: response.user?.role || 'User'
                        });
                        console.log('✅ User synced with role:', response.user?.role);
                    }
                } catch (error) {
                    console.error('Failed to sync user with backend:', error);
                }
            } else {
                this._currentUser.set(null);
                this._token.set(null);
            }
            this._isLoading.set(false);
        });
    }

    /**
     * Map Firebase User to AppUser
     */
    private mapFirebaseUser(user: User): AppUser {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            role: 'User'
        };
    }

    /**
     * Register a new user
     */
    async register(email: string, password: string): Promise<AppUser> {
        // First check if email is locked out
        const lockout = await this.checkLockoutStatus(email);
        if (lockout && lockout.locked) {
            throw new Error(`Account temporarily locked. Try again after ${new Date(lockout.lockedUntil).toLocaleTimeString()}`);
        }

        try {
            const credential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
            if (error.code === 'auth/wrong-password') {
                await this.recordLoginFailure(email);
            }
            throw this.handleAuthError(error);
        }
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<AppUser> {
        // First check if email is locked out
        const lockout = await this.checkLockoutStatus(email);
        if (lockout && lockout.locked) {
            const time = new Date(lockout.lockedUntil).toLocaleTimeString();
            throw new Error(`Account locked after too many failed attempts. Try again after ${time}.`);
        }

        try {
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
            // Firebase v9 uses 'auth/invalid-credential' for wrong password
            // Older SDKs use 'auth/wrong-password'
            const isWrongPassword = [
                'auth/wrong-password',
                'auth/invalid-credential',
                'auth/invalid-login-credentials'
            ].includes(error.code);

            if (isWrongPassword) {
                const result = await this.recordLoginFailure(email);
                if (result?.locked) {
                    const time = new Date(result.lockedUntil).toLocaleTimeString();
                    throw new Error(`Account locked after too many failed attempts. Try again after ${time}.`);
                }
            }
            throw this.handleAuthError(error);
        }
    }

    /**
     * Login with Google
     */
    async loginWithGoogle(): Promise<AppUser> {
        try {
            const provider = new GoogleAuthProvider();
            const credential = await signInWithPopup(this.auth, provider);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Login with MFA support
     */
    async loginWithMfa(email: string, password: string): Promise<MfaLoginResult> {
        // First check if email is locked out
        const lockout = await this.checkLockoutStatus(email);
        if (lockout && lockout.locked) {
            const time = new Date(lockout.lockedUntil).toLocaleTimeString();
            throw new Error(`Account locked after too many failed attempts. Try again after ${time}.`);
        }

        try {
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return { user };
        } catch (error: any) {
            // Record failure for wrong password (Firebase v9 compatibility)
            const isWrongPassword = [
                'auth/wrong-password',
                'auth/invalid-credential',
                'auth/invalid-login-credentials'
            ].includes(error.code);

            if (isWrongPassword) {
                const result = await this.recordLoginFailure(email);
                if (result?.locked) {
                    const time = new Date(result.lockedUntil).toLocaleTimeString();
                    throw new Error(`Account locked after too many failed attempts. Try again after ${time}.`);
                }
            }
            if (error.code === 'auth/multi-factor-auth-required') {
                const resolver = getMultiFactorResolver(this.auth, error as MultiFactorError);
                return { mfaRequired: true, resolver };
            }
            throw this.handleAuthError(error);
        }
    }

    /**
     * Verify TOTP code during MFA login
     */
    async verifyTotpDuringLogin(resolver: MultiFactorResolver, verificationCode: string): Promise<AppUser> {
        try {
            const totpHint = resolver.hints.find(hint => hint.factorId === 'totp');
            if (!totpHint) throw new Error('TOTP factor not found.');

            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, verificationCode);
            const credential = await resolver.resolveSignIn(multiFactorAssertion);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Check if current user has MFA enabled
     */
    async checkMfaStatus(): Promise<boolean> {
        const user = this.auth.currentUser;
        if (!user) return false;
        return multiFactor(user).enrolledFactors.length > 0;
    }

    /**
     * Start TOTP enrollment
     */
    async startTotpEnrollment(): Promise<MfaEnrollmentResult> {
        const user = this.auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        try {
            const mfaSession = await multiFactor(user).getSession();
            const totpSecret = await TotpMultiFactorGenerator.generateSecret(mfaSession);
            const qrCodeUrl = totpSecret.generateQrCodeUrl(user.email || 'User', 'CloudSpace');
            return { qrCodeUrl, secret: totpSecret };
        } catch (error: any) {
            throw new Error('Failed to start 2FA setup.');
        }
    }

    /**
     * Complete TOTP enrollment
     */
    async completeTotpEnrollment(secret: TotpSecret, verificationCode: string, displayName: string = 'Authenticator'): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        try {
            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
            await multiFactor(user).enroll(multiFactorAssertion, displayName);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Unenroll MFA factor
     */
    async unenrollMfa(factorUid: string): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        try {
            const mfaInfo = multiFactor(user);
            const factor = mfaInfo.enrolledFactors.find(f => f.uid === factorUid);
            if (factor) await mfaInfo.unenroll(factor);
        } catch (error: any) {
            throw new Error('Failed to remove 2FA.');
        }
    }

    /**
     * Get enrolled MFA factors
     */
    getEnrolledFactors(): EnrolledFactor[] {
        const user = this.auth.currentUser;
        if (!user) return [];

        return multiFactor(user).enrolledFactors.map((factor: MultiFactorInfo) => ({
            uid: factor.uid,
            displayName: factor.displayName ?? null,
            factorId: factor.factorId
        }));
    }

    /**
     * Logout
     */
    async logout(): Promise<void> {
        try {
            await signOut(this.auth);
            this._currentUser.set(null);
            this._token.set(null);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Sync user with backend
     */
    public async syncUserWithBackend(): Promise<BackendUserSyncResponse | null> {
        const token = await this.getToken();
        if (!token) return null;
        return await firstValueFrom(this.http.post<BackendUserSyncResponse>(`${environment.apiUrl}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }));
    }

    /**
     * Handle Auth Errors
     */
    private handleAuthError(error: any): Error {
        const errorMessages: { [key: string]: string } = {
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/invalid-login-credentials': 'Incorrect email or password.',
            'auth/email-already-in-use': 'Email is already registered.',
            'auth/invalid-email': 'Invalid email format.',
            'auth/invalid-verification-code': 'Invalid 2FA code.',
            'auth/too-many-requests': 'Too many failed attempts. Firebase has temporarily blocked this account.'
        };
        return new Error(errorMessages[error.code] || error.message || 'An error occurred');
    }

    /**
     * Check if user is locked out on the backend
     */
    private async checkLockoutStatus(email: string): Promise<any> {
        try {
            return await firstValueFrom(this.http.get(`${environment.apiUrl}/auth/lockout-status/${email}`));
        } catch (e) { return null; }
    }

    /**
     * Record a failure on the backend — returns lockout info if now locked
     */
    private async recordLoginFailure(email: string): Promise<any> {
        try {
            return await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/fail`, { email }));
        } catch (e) { return null; }
    }
}
