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
    role?: string;
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

    private _mfaPending = false;
    private _tempUser: AppUser | null = null;
    private _tempToken: string | null = null;

    /**
     * Setup Firebase auth state listener
     */
    private setupAuthListener(): void {
        onAuthStateChanged(this.auth, async (user) => {
            if (this._mfaPending) {
                // If MFA is pending from login flow, DO NOT set currentUser.
                if (user) {
                    this._tempUser = this.mapFirebaseUser(user);
                    this._tempToken = await user.getIdToken();
                }
                this._isLoading.set(false);
                return;
            }

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
     * Update user profile name
     */
    async updateProfileName(displayName: string): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { displayName });
            this._currentUser.set(this.mapFirebaseUser(user));
        }
    }

    /**
     * Update user profile photo
     * @param photoURL - data URL or null to remove
     */
    async updateProfilePhoto(photoURL: string | null): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { photoURL: photoURL || '' });
            this._currentUser.set(this.mapFirebaseUser(user));
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(email: string): Promise<void> {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(this.auth, email);
    }

    /**
     * Update user password directly
     */
    async updateUserPassword(newPassword: string): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            const { updatePassword } = await import('firebase/auth');
            await updatePassword(user, newPassword);
        } else {
            throw new Error('User not logged in');
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
    async loginWithMfa(email: string, password: string): Promise<any> {
        try {
            // Block automatic login until we check MFA status
            this._mfaPending = true;

            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = credential.user;
            const token = await user.getIdToken();

            // Check custom MFA status
            const res = await this.http.get<any>(`${environment.apiUrl}/auth/mfa/status`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();

            if (res.mfaEnabled) {
                console.log('🔐 MFA required for login');
                return { mfaRequired: true };
            } else {
                this._mfaPending = false;
                this._currentUser.set(this.mapFirebaseUser(user));
                this._token.set(token);
                return { user: this.mapFirebaseUser(user) };
            }
        } catch (error: any) {
            this._mfaPending = false;
            throw this.handleAuthError(error);
        }
    }

    /**
     * Verify TOTP code during MFA login
     */
    async verifyTotpCustomLogin(verificationCode: string): Promise<AppUser> {
        if (!this._tempToken || !this._tempUser) {
            throw new Error('Session expired. Please try logging in again.');
        }

        try {
            await this.http.post(`${environment.apiUrl}/auth/mfa/verify-login`,
                { token: verificationCode },
                { headers: { Authorization: `Bearer ${this._tempToken}` } }
            ).toPromise();

            // Verification successful
            this._mfaPending = false;
            this._currentUser.set(this._tempUser);
            this._token.set(this._tempToken);

            console.log('✅ MFA verification successful');
            return this._tempUser;
        } catch (error: any) {
            console.error('❌ MFA verification failed:', error);
            throw new Error(error.error?.message || 'Invalid verification code. Please try again.');
        }
    }

    /**
     * Cancel MFA login flow
     */
    cancelMfaLogin(): void {
        this._mfaPending = false;
        this._tempUser = null;
        this._tempToken = null;
        this.logout();
    }

    /**
     * Check if current user has MFA enabled (Custom API)
     */
    async checkMfaStatus(): Promise<boolean> {
        const token = await this.getToken();
        if (!token) return false;

        try {
            const res = await this.http.get<any>(`${environment.apiUrl}/auth/mfa/status`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();

            // Store enrolled factors for later use
            (this as any)._enrolledFactors = res.enrolledFactors || [];
            return res.mfaEnabled || false;
        } catch (error) {
            console.error('Failed to check custom MFA status:', error);
            return false;
        }
    }

    /**
     * Start TOTP enrollment - returns QR code URL and secret (Custom API)
     */
    async startTotpEnrollment(): Promise<any> {
        const token = await this.getToken();
        if (!token) throw new Error('User not authenticated');

        try {
            const res = await this.http.post<any>(`${environment.apiUrl}/auth/mfa/setup`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();

            console.log('🔐 TOTP enrollment started - QR code generated via custom backend');
            return { qrCodeUrl: res.qrCodeUrl, secret: res.secret };
        } catch (error: any) {
            console.error('❌ Failed to start TOTP enrollment:', error);
            throw new Error(`Failed to start 2FA setup: ${error.error?.message || error.message}`);
        }
    }

    /**
     * Complete TOTP enrollment with verification code (Custom API)
     */
    async completeTotpEnrollment(
        secret: any,
        verificationCode: string,
        displayName: string = 'Google Authenticator'
    ): Promise<void> {
        const token = await this.getToken();
        if (!token) throw new Error('User not authenticated');

        try {
            await this.http.post(`${environment.apiUrl}/auth/mfa/verify-setup`,
                {
                    secret: typeof secret === 'string' ? secret : secret.base32 || secret,
                    token: verificationCode
                },
                { headers: { Authorization: `Bearer ${token}` } }).toPromise();

            console.log('✅ TOTP enrollment completed successfully');
        } catch (error: any) {
            console.error('❌ TOTP enrollment failed:', error);
            throw new Error(error.error?.message || 'Invalid verification code. Please try again.');
        }
    }

    /**
     * Get enrolled MFA factors
     */
    getEnrolledFactors(): EnrolledFactor[] {
        return (this as any)._enrolledFactors || [];
    }

    /**
     * Unenroll a specific MFA factor (Custom API)
     */
    async unenrollMfa(factorUid: string): Promise<void> {
        const token = await this.getToken();
        if (!token) throw new Error('User not authenticated');

        try {
            await this.http.delete(`${environment.apiUrl}/auth/mfa/disable`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();

            console.log('🗑️ MFA disabled successfully');
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

        // 1. First run the sync
        await this.http.post(`${environment.apiUrl}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).toPromise();

        // 2. Then fetch the full profile to get the 'role' and update the signal
        const profileRes: any = await this.http.get(`${environment.apiUrl}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        }).toPromise();

        if (profileRes && profileRes.user) {
            this._currentUser.set({
                ...this._currentUser()!,
                role: profileRes.user.role || 'User'
            });
            console.log(`✅ User profile synced: role is ${profileRes.user.role}`);
        }
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
