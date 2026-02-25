/**
 * Admin Layout Component
 * =======================
 * Layout for the Admin Panel with its own sidebar and navigation.
 */

import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="admin-layout" [attr.data-theme]="theme()">
      <!-- Mobile Overlay -->
      <div *ngIf="mobileOpen()" 
           class="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity backdrop-blur-sm"
           (click)="toggleMobileSidebar()">
      </div>

      <!-- Sidebar -->
      <aside class="sidebar admin-sidebar" 
             [class.collapsed]="sidebarCollapsed()" 
             [class.mobile-open]="mobileOpen()">
             
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon bg-indigo-600">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-title">Admin Panel</span>
            </div>
          </div>
          <button class="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100" (click)="toggleMobileSidebar()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-label">Main</div>
          
          <a routerLink="/admin/dashboard" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span>Dashboard</span>
          </a>

          <a routerLink="/admin/users" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <span>User Management</span>
          </a>

          <a routerLink="/admin/storage" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
            </svg>
            <span>Storage Monitor</span>
          </a>

          <div class="nav-section-label">Operations</div>

          <a routerLink="/admin/ai-usage" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>AI Assistant Usage</span>
          </a>

          <a routerLink="/admin/subscriptions" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <span>Subscription Plans</span>
          </a>

          <div class="nav-section-label">System</div>

          <a routerLink="/admin/audit-logs" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            <span>Security Audit Logs</span>
          </a>

          <a routerLink="/admin/analytics" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            <span>Analytics & Reports</span>
          </a>

          <a routerLink="/admin/settings" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>System Settings</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="flex items-center justify-between">
            <button (click)="goToUserPanel()" class="btn-secondary text-xs px-2 py-1">
              User Panel
            </button>
            <button (click)="logout()" class="text-gray-400 hover:text-red-500 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content" [class.sidebar-collapsed]="sidebarCollapsed()">
        <header class="main-header">
          <div class="flex items-center gap-4">
            <button (click)="toggleSidebar()" class="btn-ghost p-2 max-md:hidden">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <button (click)="toggleMobileSidebar()" class="md:hidden btn-ghost p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <h1 class="text-xl font-bold text-slate-900">Admin Control Center</h1>
          </div>

          <div class="flex items-center gap-3 relative">

            <!-- Notification Bell -->
            <div class="relative">
              <button (click)="notifOpen.set(!notifOpen())"
                      class="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span *ngIf="unreadCount() > 0"
                      class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{{ unreadCount() }}</span>
              </button>

              <!-- Notification Dropdown -->
              <div *ngIf="notifOpen()" class="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <h3 class="font-bold text-slate-900 text-sm">Notifications</h3>
                  <button (click)="markAllRead()" class="text-xs text-indigo-500 hover:underline font-medium">Mark all read</button>
                </div>
                <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  <div *ngFor="let n of notifications()" (click)="readNotif(n)"
                       class="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                         [class.bg-indigo-500]="!n.read"
                         [class.bg-slate-200]="n.read"></div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-800">{{ n.title }}</p>
                      <p class="text-xs text-slate-400 mt-0.5">{{ n.body }}</p>
                      <p class="text-[10px] text-slate-300 mt-1">{{ n.time }}</p>
                    </div>
                  </div>
                  <div *ngIf="!notifications().length" class="px-5 py-8 text-center text-slate-400 text-sm">No notifications</div>
                </div>
                <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
                  <button (click)="notifOpen.set(false)" class="text-xs text-slate-400 hover:text-slate-600">Close</button>
                </div>
              </div>
            </div>

            <!-- Single clean user block -->
            <div class="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {{ userInitial() }}
              </div>
              <div class="leading-tight hidden md:block">
                <p class="text-sm font-semibold text-slate-800">{{ userName() }}</p>
                <p class="text-[11px] text-slate-400">{{ authService.currentUser()?.email }}</p>
              </div>
              <button (click)="logout()" title="Logout"
                      class="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>

          </div>
        </header>

        <div class="content-area p-6">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .nav-section-label {
      padding: 1.5rem 1.5rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      opacity: 0.5;
    }
  `]
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  router      = inject(Router);

  sidebarCollapsed = signal(false);
  mobileOpen       = signal(false);
  theme            = signal<'light' | 'dark'>('light');
  notifOpen        = signal(false);

  notifications = signal([
    { id: 1, title: 'New user registered',   body: 'A new user signed up via email.',         time: '2 min ago',  read: false },
    { id: 2, title: 'Storage usage at 80%',  body: 'Total cloud storage is nearing the cap.', time: '1 hour ago', read: false },
    { id: 3, title: 'Settings updated',      body: 'System settings were updated by admin.',  time: 'Yesterday',  read: true  },
  ]);

  unreadCount() { return this.notifications().filter(n => !n.read).length; }

  userInitial() {
    const u = this.authService.currentUser();
    if (u?.displayName) return u.displayName[0].toUpperCase();
    if (u?.email)       return u.email[0].toUpperCase();
    return 'A';
  }

  userName() {
    const u = this.authService.currentUser();
    return u?.displayName || u?.email?.split('@')[0] || 'Admin';
  }

  readNotif(n: any) {
    this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
  }

  markAllRead() {
    this.notifications.update(list => list.map(x => ({ ...x, read: true })));
  }

  toggleSidebar()       { this.sidebarCollapsed.set(!this.sidebarCollapsed()); }
  toggleMobileSidebar() { this.mobileOpen.set(!this.mobileOpen()); }
  goToUserPanel()       { this.router.navigate(['/dashboard']); }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
