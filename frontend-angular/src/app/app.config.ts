/**
 * Application Configuration
 * ==========================
 * Configures providers for the Angular application.
 */

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { ErrorHandler } from '@angular/core';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes, withViewTransitions()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAnimations(),
        provideCharts(withDefaultRegisterables()),
        { provide: ErrorHandler, useClass: GlobalErrorHandler }
    ]
};
