/**
 * Auth Interceptor
 * ==================
 * Automatically adds Firebase ID token to outgoing HTTP requests.
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
) => {
    const authService = inject(AuthService);

    // Only add token for API requests
    if (!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }

    return from(authService.getToken()).pipe(
        switchMap(token => {
            const isNgrokRequest = req.url.includes('.ngrok-free.dev');
            const headers: Record<string, string> = {};

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            if (isNgrokRequest) {
                headers['ngrok-skip-browser-warning'] = 'true';
            }

            if (Object.keys(headers).length > 0) {
                const authReq = req.clone({
                    setHeaders: headers
                });
                return next(authReq);
            }
            return next(req);
        })
    );
};
