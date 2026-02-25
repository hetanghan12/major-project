/**
 * Landing Guard
 * =============
 * Redirects Admins to the Admin Panel and Users to the Dashboard
 * when they hit the root URL.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const landingGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth session to be restored (same as adminGuard)
  await waitForAuth(authService);

  const user = authService.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // If role isn't 'Admin' yet, we might want to wait a bit for the sync
  // but for the root redirect, we can rely on the email fallback too
  const adminEmail = 'admin@cloudspace.com';
  const isAdmin = user.role === 'Admin' || user.email === adminEmail;
  
  if (isAdmin) {
    if (state.url.startsWith('/admin')) {
      return true;
    }
    console.log('🚀 Landing Guard: Admin detected, sending to Admin Panel');
    router.navigate(['/admin/dashboard']);
    return false;
  }

  // Regular user - if already going to dashboard or other user pages, let them
  if (state.url === '/dashboard' || state.url === '/') {
    if (state.url === '/') {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
  
  return true;
};

function waitForAuth(authService: AuthService): Promise<void> {
  return new Promise(resolve => {
    if (!authService.isLoading()) {
      resolve();
      return;
    }
    let waited = 0;
    const timer = setInterval(() => {
      waited += 50;
      if (!authService.isLoading() || waited >= 3000) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
}
