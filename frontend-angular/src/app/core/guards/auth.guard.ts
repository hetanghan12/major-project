/**
 * Auth Guard
 * ============
 * Protects routes that require authentication.
 */

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is loading
    if (authService.isLoading()) {
        // Wait for auth check to complete
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (!authService.isLoading()) {
                    clearInterval(checkAuth);
                    if (authService.isAuthenticated()) {
                        resolve(true);
                    } else {
                        router.navigate(['/login'], {
                            queryParams: { returnUrl: state.url }
                        });
                        resolve(false);
                    }
                }
            }, 100);
        });
    }

    if (authService.isAuthenticated()) {
        const user = authService.currentUser();
        const role = user?.role?.toLowerCase();

        // Prevent admin from accessing normal user dashboard
        if (role === 'admin' || user?.email === 'admin@cloudspace.com') {
            if (state.url === '/dashboard' || state.url.startsWith('/dashboard?')) {
                router.navigate(['/admin/dashboard']);
                return false;
            }
        }

        return true;
    }

    // Redirect to login
    router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
    });
    return false;
};
