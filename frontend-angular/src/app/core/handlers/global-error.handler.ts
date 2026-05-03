/**
 * Global Error Handler
 * =====================
 * Captures all unhandled client-side errors to prevent app crashes
 * and provide a consistent error reporting mechanism.
 */

import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private injector: Injector) {}

    handleError(error: any): void {
        const chunkFailedMessage = /Loading chunk [\d]+ failed/;

        if (chunkFailedMessage.test(error.message)) {
            // Lazy loading failed - often due to a new deployment
            console.warn('📦 Chunk loading failed. Reloading page...');
            window.location.reload();
            return;
        }

        // Log the error
        console.error('🚨 [Global Error]:', error);

        // In development, show full details
        if (!environment.production) {
            console.dir(error);
        }

        // TODO: In a real production app, you would send this to a service 
        // like Sentry, LogRocket, or your own backend audit log.
    }
}
