import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const adminGuard = async () => {
    const authService = inject(AuthService);
    const http = inject(HttpClient);
    const router = inject(Router);

    try {
        const token = await authService.getToken();
        if (!token) {
            router.navigate(['/login']);
            return false;
        }

        const res: any = await firstValueFrom(http.get(`${environment.apiUrl}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        }));

        const role = res.user?.role?.toLowerCase();
        const email = res.user?.email || '';

        if (res.user && (role === 'admin' || email === 'admin@cloudspace.com' || email === 'admin@admin.com')) {
            return true;
        } else {
            console.warn(`🚫 Non-admin access attempt to admin route by ${email}. Redirecting to user dashboard.`);
            router.navigate(['/dashboard']);
            return false;
        }
    } catch (err) {
        console.error('❌ Admin Guard Check Failed:', err);
        router.navigate(['/dashboard']);
        return false;
    }
};
