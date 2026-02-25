/**
 * Admin Guard
 * ===========
 * Protects admin routes from non-administrative users.
 * Waits for Firebase auth state to resolve before making a decision.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait up to 3 seconds for Firebase to restore auth session
  await waitForAuth(authService);

  const user = authService.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Allow if role is 'Admin' (set after backend sync)
  if (user.role === 'Admin') {
    return true;
  }

  // Fallback: allow if email matches the admin email
  const adminEmail = 'admin@cloudspace.com';
  if (user.email === adminEmail) {
    return true;
  }

  // Not an admin
  router.navigate(['/dashboard']);
  return false;
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
