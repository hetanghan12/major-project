import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
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

    // Simple upload route (no auth required - for testing)
    {
        path: 'upload',
        loadComponent: () => import('./simple-upload/simple-upload.component').then(m => m.SimpleUploadComponent)
    },

    // User Panel routes (require User Dashboard Layout)
    {
        path: '',
        loadComponent: () => import('./layouts/user-layout/user-layout.component').then(m => m.UserLayoutComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'documents',
                loadComponent: () => import('./documents/documents.component').then(m => m.DocumentsComponent)
            },
            {
                path: 'chat',
                loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent)
            },
            {
                path: 'storage-insights',
                loadComponent: () => import('./storage-insights/storage-insights.component').then(m => m.StorageInsightsComponent)
            },
            {
                path: 'settings',
                loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
            },
            {
                path: 'plans',
                loadComponent: () => import('./plans/plans.component').then(m => m.PlansComponent)
            },
            {
                path: 'settings/security',
                loadComponent: () => import('./settings/mfa-setup/mfa-setup.component').then(m => m.MfaSetupComponent)
            },
            {
                path: 'settings/change-password',
                loadComponent: () => import('./settings/change-password/change-password.component').then(m => m.ChangePasswordComponent)
            }
        ]
    },

    // Admin Panel routes (require Admin Layout)
    {
        path: 'admin',
        loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        canActivate: [adminGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent) },
            { path: 'users', loadComponent: () => import('./admin/users/users.component').then(m => m.AdminUsersComponent) },
            { path: 'storage', loadComponent: () => import('./admin/storage-monitor/storage-monitor.component').then(m => m.StorageMonitorComponent) },
            { path: 'ai-usage', loadComponent: () => import('./admin/ai-usage/ai-usage.component').then(m => m.AiUsageComponent) },
            { path: 'plans', loadComponent: () => import('./admin/plans/plans.component').then(m => m.AdminPlansComponent) },
            { path: 'audit', loadComponent: () => import('./admin/audit-logs/audit-logs.component').then(m => m.AdminAuditLogsComponent) },
            { path: 'analytics', loadComponent: () => import('./admin/analytics/analytics.component').then(m => m.ReportsComponent) },
            { path: 'settings', loadComponent: () => import('./admin/settings/settings.component').then(m => m.AdminSettingsComponent) }
        ]
    },

    // Catch-all redirect
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
