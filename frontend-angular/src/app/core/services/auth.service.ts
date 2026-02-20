/**
 * Authentication Service
 * ========================
 * Handles Firebase Authentication operations including MFA (Multi-Factor Authentication).
 * 
 * MFA Features:
 * - TOTP enrollment (Google Authenticator compatible)
 * - MFA verification during login
 * - MFA status checking and unenrollment
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

// User interface
export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
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
                this._currentUser.set(this.mapFirebaseUser(user));
                this._token.set(await user.getIdToken());

                // Sync with backend
                try {
                    await this.syncUserWithBackend();
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
            emailVerified: user.emailVerified
        };
    }

    /**
     * Register a new user
     */
    async register(email: string, password: string): Promise<AppUser> {
        try {
            const credential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    /**
     * Login with email and password (basic - no MFA handling)
     */
    async login(email: string, password: string): Promise<AppUser> {
        try {
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return user;
        } catch (error: any) {
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

    // ==========================================================================
    // MFA (MULTI-FACTOR AUTHENTICATION) METHODS
    // ==========================================================================

    /**
     * Login with MFA support
     * Returns either a successful user or indicates MFA is required
     */
    async loginWithMfa(email: string, password: string): Promise<MfaLoginResult> {
        try {
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);
            return { user };
        } catch (error: any) {
            // Check if MFA is required
            if (error.code === 'auth/multi-factor-auth-required') {
                console.log('🔐 MFA required for login');
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
            // Find TOTP hint
            const totpHint = resolver.hints.find(hint => hint.factorId === 'totp');

            if (!totpHint) {
                throw new Error('TOTP factor not found. Please contact support.');
            }

            // Create assertion for sign-in
            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
                totpHint.uid,
                verificationCode
            );

            // Complete the sign-in
            const credential = await resolver.resolveSignIn(multiFactorAssertion);
            const user = this.mapFirebaseUser(credential.user);
            this._currentUser.set(user);

            console.log('✅ MFA verification successful');
            return user;
        } catch (error: any) {
            console.error('❌ MFA verification failed:', error);
            if (error.code === 'auth/invalid-verification-code') {
                throw new Error('Invalid verification code. Please try again.');
            }
            throw this.handleAuthError(error);
        }
    }

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
     * Start TOTP enrollment - returns QR code URL and secret
     */
    async startTotpEnrollment(): Promise<MfaEnrollmentResult> {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            // Get MFA session
            const mfaSession = await multiFactor(user).getSession();

            // Generate TOTP secret
            const totpSecret = await TotpMultiFactorGenerator.generateSecret(mfaSession);

            // Generate QR code URL for authenticator apps
            const qrCodeUrl = totpSecret.generateQrCodeUrl(
                user.email || 'User',
                'CloudAI Document Vault'
            );

            console.log('🔐 TOTP enrollment started - QR code generated');

            return { qrCodeUrl, secret: totpSecret };
        } catch (error: any) {
            console.error('❌ Failed to start TOTP enrollment:', error);
            throw new Error('Failed to start 2FA setup. Please try again.');
        }
    }

    /**
     * Complete TOTP enrollment with verification code
     */
    async completeTotpEnrollment(
        secret: TotpSecret,
        verificationCode: string,
        displayName: string = 'Google Authenticator'
    ): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            // Generate multi-factor assertion for enrollment
            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
                secret,
                verificationCode
            );

            // Enroll the TOTP factor
            await multiFactor(user).enroll(multiFactorAssertion, displayName);

            console.log('✅ TOTP enrollment completed successfully');
        } catch (error: any) {
            console.error('❌ TOTP enrollment failed:', error);
            if (error.code === 'auth/invalid-verification-code') {
                throw new Error('Invalid verification code. Please try again.');
            }
            throw new Error('Failed to complete 2FA setup. Please try again.');
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
     * Unenroll a specific MFA factor
     */
    async unenrollMfa(factorUid: string): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const mfaInfo = multiFactor(user);
        const factor = mfaInfo.enrolledFactors.find(f => f.uid === factorUid);

        if (!factor) {
            throw new Error('MFA factor not found');
        }

        try {
            await mfaInfo.unenroll(factor);
            console.log('🗑️ MFA factor unenrolled successfully');
        } catch (error: any) {
            console.error('❌ Failed to unenroll MFA:', error);
            throw new Error('Failed to remove 2FA. Please try again.');
        }
    }

    // ==========================================================================
    // END MFA METHODS
    // ==========================================================================

    /**
     * Logout current user
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
     * Sync user data with backend
     */
    private async syncUserWithBackend(): Promise<void> {
        const token = await this.getToken();
        if (!token) return;

        await this.http.post(`${environment.apiUrl}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).toPromise();
    }

    /**
     * Handle Firebase auth errors
     */
    private handleAuthError(error: any): Error {
        const errorMessages: { [key: string]: string } = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'Email is already registered',
            'auth/invalid-email': 'Invalid email format',
            'auth/weak-password': 'Password is too weak (min 6 characters)',
            'auth/too-many-requests': 'Too many attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
            'auth/multi-factor-auth-required': 'Two-factor authentication required',
            'auth/invalid-verification-code': 'Invalid verification code'
        };

        const message = errorMessages[error.code] || error.message || 'An error occurred';
        return new Error(message);
    }
}
