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

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
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
    signInWithPopup,
    sendPasswordResetEmail
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
    plan?: string;
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

    // 🏆 Professional BehaviorSubject State (Senior Pattern)
    private userSubject = new BehaviorSubject<AppUser | null>(this.loadUserFromStorage());
    public currentUser$ = this.userSubject.asObservable();

    // Session Timeout Logic
    private inactivityTimer: any;
    private sessionTimeoutMinutes: number = 60; // Default 1 hour
    private activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    private boundResetTimer = this.resetInactivityTimer.bind(this);

    // Public computed values
    readonly currentUser = computed(() => this._currentUser());
    readonly isLoading = computed(() => this._isLoading());

    // Centralized Premium logic
    readonly isPremium = computed(() => {
        const user = this._currentUser();
        if (!user) return false;

        // Admins are always premium
        const role = (user.role || '').toLowerCase();
        if (role === 'admin') return true;

        // Plan check
        const plan = (user.plan || 'free').toLowerCase().trim();
        return ['pro', 'professional', 'premium', 'business', 'enterprise'].includes(plan);
    });

    constructor(private http: HttpClient, private router: Router) {
        console.log('🚀 [AuthService] Initializing System...');

        // Initialize Firebase
        const app = initializeApp(environment.firebase);
        this.auth = getAuth(app);

        // Listen to auth state changes
        this.setupAuthListener();

        // Listen for navigation resets
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.resetInactivityTimer();
            }
        });
    }

    /**
     * Helper to load user from localStorage at startup
     */
    private loadUserFromStorage(): AppUser | null {
        if (typeof window === 'undefined') return null;
        const saved = localStorage.getItem('cloudspace_auth_user');
        if (saved) {
            try {
                const user = JSON.parse(saved);
                console.log('📦 [AuthService] Restored user from cache:', user.email);
                return user;
            } catch (e) {
                localStorage.removeItem('cloudspace_auth_user');
            }
        }
        return null;
    }

    /**
     * 🛡️ Centralized State Sync (Signal + Subject + Storage)
     */
    private updateAuthState(user: AppUser | null): void {
        console.log('🔄 [AuthService] 🟢 STATE SYNC:', user ? user.email : 'LOGOUT');
        this._currentUser.set(user);
        this.userSubject.next(user);
        if (user) {
            localStorage.setItem('cloudspace_auth_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('cloudspace_auth_user');
        }
    }

    /**
     * Snapshot getter
     */
    getCurrentUser(): AppUser | null {
        return this.userSubject.value;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.userSubject.value !== null;
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
     * Check auth state (Required by app.component)
     */
    checkAuthState(): void {
        // Handled by setupAuthListener
    }

    private _mfaPending = false;
    private _tempUser: AppUser | null = null;
    private _tempToken: string | null = null;

    private setupAuthListener(): void {
        onAuthStateChanged(this.auth, async (user) => {
            console.log('📡 [AuthService] Firebase Event:', user ? `LoggedIn: ${user.email}` : 'LoggedOut');

            if (this._mfaPending) {
                if (user) {
                    this._tempUser = this.mapFirebaseUser(user);
                    this._tempToken = await user.getIdToken();
                }
                this._isLoading.set(false);
                return;
            }

            if (user) {
                const appUser = this.mapFirebaseUser(user);
                this.updateAuthState(appUser);
                this._token.set(await user.getIdToken());

                try {
                    await this.syncUserWithBackend();
                } catch (error) {
                    console.error('❌ [AuthService] Backend sync failed:', error);
                }
            } else {
                this.updateAuthState(null);
                this._token.set(null);
            }
            this._isLoading.set(false);
        });
    }

    private mapFirebaseUser(user: User): AppUser {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
        };
    }

    async register(email: string, password: string): Promise<AppUser> {
        try {
            const credential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this.updateAuthState(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    async login(email: string, password: string): Promise<AppUser> {
        try {
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = this.mapFirebaseUser(credential.user);
            this.updateAuthState(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    async loginWithGoogle(): Promise<AppUser> {
        try {
            const provider = new GoogleAuthProvider();
            const credential = await signInWithPopup(this.auth, provider);
            const user = this.mapFirebaseUser(credential.user);
            this.updateAuthState(user);
            return user;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    async loginWithMfa(email: string, password: string): Promise<any> {
        try {
            this._mfaPending = true;
            const credential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = credential.user;
            const token = await user.getIdToken();

            const res = await this.http.get<any>(`${environment.apiUrl}/auth/mfa/status`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();

            if (res.mfaEnabled) {
                return { mfaRequired: true };
            } else {
                this._mfaPending = false;
                const appUser = this.mapFirebaseUser(user);
                this.updateAuthState(appUser);
                return { user: appUser };
            }
        } catch (error: any) {
            this._mfaPending = false;
            throw this.handleAuthError(error);
        }
    }

    async logout(): Promise<void> {
        try {
            console.log('🚪 [AuthService] Logout');
            await signOut(this.auth);
            this.updateAuthState(null);
            this._token.set(null);
            this.stopInactivityTimer();
            localStorage.clear();
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // MFA & Profile Methods (Restored missing methods)

    async sendPasswordResetEmail(email: string): Promise<void> {
        try {
            await sendPasswordResetEmail(this.auth, email);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    async verifyTotpCustomLogin(verificationCode: string): Promise<AppUser> {
        if (!this._tempToken || !this._tempUser) throw new Error('Session expired');
        try {
            await this.http.post(`${environment.apiUrl}/auth/mfa/verify-login`,
                { token: verificationCode },
                { headers: { Authorization: `Bearer ${this._tempToken}` } }).toPromise();
            this._mfaPending = false;
            this.updateAuthState(this._tempUser);
            return this._tempUser;
        } catch (error: any) {
            throw new Error('Invalid code');
        }
    }

    cancelMfaLogin(): void {
        this._mfaPending = false;
        this.logout();
    }

    async updateUserPassword(newPassword: string): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Not logged in');
        const { updatePassword } = await import('firebase/auth');
        await updatePassword(user, newPassword);
    }

    async updateProfileName(displayName: string): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { displayName });
            this.updateAuthState(this.mapFirebaseUser(user));
        }
    }

    async updateProfilePhoto(photoURL: string | null): Promise<void> {
        const user = this.auth.currentUser;
        if (user) {
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { photoURL: photoURL || '' });
            this.updateAuthState(this.mapFirebaseUser(user));
        }
    }

    async checkMfaStatus(): Promise<boolean> {
        try {
            const token = await this.getToken();
            if (!token) return false;
            const res = await this.http.get<any>(`${environment.apiUrl}/auth/mfa/status`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();
            (this as any)._enrolledFactors = res.enrolledFactors || [];
            return res.mfaEnabled || false;
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    getEnrolledFactors(): EnrolledFactor[] {
        return (this as any)._enrolledFactors || [];
    }

    async startTotpEnrollment(): Promise<any> {
        try {
            const token = await this.getToken();
            if (!token) throw new Error('Not authenticated');
            return await this.http.post<any>(`${environment.apiUrl}/auth/mfa/setup`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async completeTotpEnrollment(secret: any, verificationCode: string): Promise<void> {
        try {
            const token = await this.getToken();
            if (!token) throw new Error('Not authenticated');
            await this.http.post(`${environment.apiUrl}/auth/mfa/verify-setup`,
                { secret: secret.base32 || secret, token: verificationCode },
                { headers: { Authorization: `Bearer ${token}` } }).toPromise();
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    async unenrollMfa(factorUid: string): Promise<void> {
        try {
            const token = await this.getToken();
            if (!token) throw new Error('Not authenticated');
            await this.http.delete(`${environment.apiUrl}/auth/mfa/disable`, {
                headers: { Authorization: `Bearer ${token}` }
            }).toPromise();
        } catch (error) {
            throw this.handleAuthError(error);
        }
    }

    // Session Management

    private startInactivityTimer(minutes?: number): void {
        if (minutes) this.sessionTimeoutMinutes = minutes;
        this.stopInactivityTimer();
        if (typeof window !== 'undefined') {
            this.resetInactivityTimer();
            this.activityEvents.forEach(event => window.addEventListener(event, this.boundResetTimer, { passive: true }));
        }
    }

    private stopInactivityTimer(): void {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        if (typeof window !== 'undefined') {
            this.activityEvents.forEach(event => window.removeEventListener(event, this.boundResetTimer));
        }
    }

    public resetInactivityTimer(): void {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.logout().then(() => window.location.href = '/login?reason=timeout');
        }, this.sessionTimeoutMinutes * 60000);
    }

    private async syncUserWithBackend(): Promise<void> {
        const token = await this.getToken();
        if (!token) return;

        const syncRes: any = await this.http.post(`${environment.apiUrl}/auth/sync`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        }).toPromise();

        if (syncRes && syncRes.user) {
            const current = this.userSubject.value;
            const updated: AppUser = {
                ...current!,
                email: current?.email || null, // Explicitly preserve email
                displayName: syncRes.user.displayName || current?.displayName,
                photoURL: syncRes.user.photoURL || current?.photoURL,
                role: syncRes.user.role || (current?.role) || 'User',
                plan: syncRes.user.plan || 'free'
            };
            this.updateAuthState(updated);
        }
    }

    private handleAuthError(error: any): Error {
        // If it's an HTTP error from our backend
        if (error.error && error.error.message) {
            return new Error(error.error.message);
        }

        let message = error.code || error.message || 'Authentication error';
        
        // Map common Firebase codes to user-friendly messages
        if (message.includes('auth/unauthorized-domain')) {
            message = 'Unauthorized Domain: Add this IP/domain to Authorized Domains in Firebase Console Settings.';
        } else if (message.includes('auth/popup-closed-by-user')) {
            message = 'The login window was closed. Please try again.';
        } else if (message.includes('auth/network-request-failed')) {
            message = 'Network error: Check your internet connection.';
        } else if (message.includes('auth/invalid-credential')) {
            message = 'Invalid email or password.';
        }
        
        return new Error(message);
    }
}
