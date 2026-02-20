/**
 * Guest Guard
 * =============
 * Prevents authenticated users from accessing login/register pages.
 */

import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if user is loading
    if (authService.isLoading()) {
        return new Promise((resolve) => {
            const checkAuth = setInterval(() => {
                if (!authService.isLoading()) {
                    clearInterval(checkAuth);
                    if (!authService.isAuthenticated()) {
                        resolve(true);
                    } else {
                        router.navigate(['/dashboard']);
                        resolve(false);
                    }
                }
            }, 100);
        });
    }

    if (!authService.isAuthenticated()) {
        return true;
    }

    // Already logged in, redirect to dashboard
    router.navigate(['/dashboard']);
    return false;
};
