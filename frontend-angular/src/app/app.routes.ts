/**
 * Application Routes
 * ====================
 * Defines all routes for the Cloud Space application.
 */

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
    // Default redirect
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },

    // Authentication routes (accessible only when NOT logged in)
    {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard]
    },

    // Protected routes (require authentication)
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: 'documents',
        loadComponent: () => import('./documents/documents.component').then(m => m.DocumentsComponent),
        canActivate: [authGuard]
    },
    {
        path: 'chat',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
        canActivate: [authGuard]
    },

    // Settings routes (require authentication)
    {
        path: 'settings/security',
        loadComponent: () => import('./settings/mfa-setup/mfa-setup.component').then(m => m.MfaSetupComponent),
        canActivate: [authGuard]
    },

    // Simple upload route (no auth required - for testing)
    {
        path: 'upload',
        loadComponent: () => import('./simple-upload/simple-upload.component').then(m => m.SimpleUploadComponent)
    },

    // Catch-all redirect
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
