/**
 * Application Routes
 * ====================
 * Defines all routes for the Cloud Space application.
 */

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { landingGuard } from './core/guards/landing.guard';

export const routes: Routes = [
    // Default redirect (Role-aware)
    {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [landingGuard],
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
        canActivate: [authGuard, landingGuard]
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

    // Admin routes (require authentication and admin role)
    {
        path: 'admin',
        loadComponent: () => import('./admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        canActivate: [authGuard, adminGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./admin/users/user-management.component').then(m => m.UserManagementComponent)
            },
            {
                path: 'storage',
                loadComponent: () => import('./admin/storage/storage-monitor.component').then(m => m.StorageMonitorComponent)
            },
            {
                path: 'ai-usage',
                loadComponent: () => import('./admin/ai-usage/ai-usage.component').then(m => m.AIUsageComponent)
            },
            {
                path: 'subscriptions',
                loadComponent: () => import('./admin/subscriptions/subscription-plans.component').then(m => m.SubscriptionPlansComponent)
            },
            {
                path: 'audit-logs',
                loadComponent: () => import('./admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./admin/analytics/analytics.component').then(m => m.AnalyticsComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('./admin/settings/system-settings.component').then(m => m.SystemSettingsComponent)
            }
        ]
    },

    // Catch-all redirect
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
