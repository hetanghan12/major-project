import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
    standalone: true,
    selector: 'app-admin-layout',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="admin-container">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="sidebar-header">
          <div class="logo-box">
             <div class="shield-icon">
               <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 2L4 5V11C4 16.19 7.41 21.05 12 22C16.59 21.05 20 16.19 20 11V5L12 2Z" fill="#6E56EB"/>
                 <path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
             </div>
             <span class="logo-text">Central Admin</span>
           </div>
        </div>

        <div class="nav-content">
          <div class="nav-section">
            <h3 class="section-label">MAIN</h3>
            <ul class="nav-links">
              <li>
                <a routerLink="dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>Dashboard</span>
                </a>
              </li>
              <li>
                <a routerLink="users" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>User Management</span>
                </a>
              </li>
              <li>
                <a routerLink="storage" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                  <span>Storage Monitor</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="nav-section">
            <h3 class="section-label">OPERATIONS</h3>
            <ul class="nav-links">
              <li>
                <a routerLink="plans" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <span>Subscription Plans</span>
                </a>
              </li>
              <li>
                <a routerLink="subscriptions" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  <span>Subscribers</span>
                </a>
              </li>
            </ul>
          </div>

          <div class="nav-section">
            <h3 class="section-label">SYSTEM</h3>
            <ul class="nav-links">
              <li>
                <a routerLink="audit" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>
                  <span>Security Audit Logs</span>
                </a>
              </li>
              <li>
                <a routerLink="analytics" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  <span>Analytics & Reports</span>
                </a>
              </li>
              <li>
                <a routerLink="settings" routerLinkActive="active">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  <span>System Settings</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="sidebar-footer">
          <button type="button" class="back-link logout-btn-red" (click)="handleLogout()">
            <svg class="icon small-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="main-content">
        <header class="admin-header">
           <div class="header-left">
             <button class="menu-toggle">
               <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
             <h2 class="header-title">Admin Control Center</h2>
           </div>
           
           <div class="header-search">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Search files, logs, or metrics...">
           </div>

           <div class="header-actions">
             <div class="relative">
                <button class="notification-btn" (click)="toggleNotifications($event)">
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="#64748b" stroke-width="2" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
                </button>

                <!-- Admin Notification Dropdown -->
                <div *ngIf="showNotifications()" class="notification-dropdown">
                    <div class="dropdown-header">
                        <h3>Notifications</h3>
                        <button (click)="markAllRead()" class="text-link">Mark all as read</button>
                    </div>
                    <div class="dropdown-content">
                        <div *ngIf="notifications().length === 0" class="empty-state">
                            No notifications yet
                        </div>
                        <div *ngFor="let note of notifications()" class="notification-item" [class.unread]="!note.read">
                            <div class="note-icon" [ngClass]="note.type.toLowerCase()">
                                <span *ngIf="note.type === 'USER_SIGNUP'">👤</span>
                                <span *ngIf="note.type === 'SECURITY'">🔒</span>
                                <span *ngIf="note.type === 'SYSTEM_ALERT'">⚠️</span>
                            </div>
                            <div class="note-body">
                                <p class="note-message">{{ note.message }}</p>
                                <span class="note-time">{{ note.createdAt | date:'shortTime' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
             
             <div class="user-profile" *ngIf="authService.currentUser$ | async as user; else loading">
               <div class="avatar">{{ (user.displayName || user.email || 'A').charAt(0).toUpperCase() }}</div>
               <div class="user-info">
                 <span class="user-name">{{ user.displayName || 'Admin' }}</span>
                 <span class="user-email">{{ user.email }}</span>
               </div>
               <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94a3b8" stroke-width="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
             </div>

             <ng-template #loading>
               <div class="user-profile">
                 <div class="avatar">...</div>
                 <div class="user-info">
                   <span class="user-name">Loading...</span>
                 </div>
               </div>
             </ng-template>
           </div>
        </header>

        <div class="page-container">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      height: 100vh;
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg-main);
      color: var(--text-primary);
    }
    /* Notification Dropdown Styles */
    .relative { position: relative; }
    .notification-dropdown {
        position: absolute;
        top: 40px;
        right: 0;
        width: 320px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        z-index: 1000;
        overflow: hidden;
    }
    .dropdown-header {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-card);
    }
    .dropdown-header h3 { font-size: 14px; font-weight: 700; margin: 0; }
    .text-link { background: none; border: none; font-size: 11px; color: #6E56EB; cursor: pointer; font-weight: 600; }
    .dropdown-content { max-height: 400px; overflow-y: auto; }
    .notification-item {
        padding: 1rem;
        display: flex;
        gap: 12px;
        border-bottom: 1px solid #f8fafc;
        transition: background 0.2s;
        cursor: pointer;
    }
    .notification-item.unread { background: #faf9ff; }
    .notification-item:hover { background: #f8fafc; }
    .note-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
    }
    .note-icon.user_signup { background: #e0f2fe; }
    .note-icon.security { background: #fee2e2; }
    .note-icon.system_alert { background: #fef3c7; }
    .note-message { font-size: 12.5px; color: #334155; margin: 0; line-height: 1.4; font-weight: 500; }
    .note-time { font-size: 10px; color: #94a3b8; display: block; margin-top: 4px; }
    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; font-size: 13px; }

    .admin-container {
      display: flex;
      height: 100%;
    }
    .sidebar {
      width: 260px;
      background: var(--bg-card);
      height: 100%;
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
    }
    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      height: 72px;
      display: flex;
      align-items: center;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .shield-icon {
      width: 24px;
      height: 24px;
      display: flex;
    }
    .logo-text {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.3px;
    }
    .nav-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1rem;
    }
    .nav-section {
      margin-bottom: 1.5rem;
    }
    .section-label {
      font-size: 11px;
      font-weight: 800;
      color: #9ca3af;
      padding: 0 1.5rem;
      margin-bottom: 0.75rem;
      letter-spacing: 1.2px;
    }
    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .nav-links li {
      margin-bottom: 4px;
    }
    .nav-links a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0.75rem 1.25rem;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.2s ease;
      border-radius: 8px;
    }
    .nav-links a:hover {
      background: var(--bg-hover);
      color: var(--primary);
    }
    .nav-links a.active {
      background: var(--primary-light);
      color: var(--primary);
      position: relative;
    }
    .nav-links a.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      width: 3px;
      background: var(--primary);
      border-radius: 0 4px 4px 0;
    }
    .icon {
      width: 18px;
      height: 18px;
      stroke-width: 2px;
    }
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid #f1f1f1;
    }
    .back-link {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      padding: 0.8rem 1.25rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 10px;
      color: #94a3b8;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logout-btn-red {
      color: #ef4444 !important;
      font-weight: 700 !important;
      margin-top: 8px;
    }
    .logout-btn-red:hover {
      background: #fef2f2 !important;
      color: #dc2626 !important;
    }
    .small-icon {
      width: 16px;
      height: 16px;
    }
    .back-link:hover {
      color: #64748b;
      background: #f8fafc;
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--bg-main);
    }
    .admin-header {
      height: 72px;
      background: var(--bg-card);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .menu-toggle {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0;
      display: flex;
    }
    .header-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .header-search {
      flex: 1;
      max-width: 480px;
      margin: 0 2rem;
      position: relative;
      display: flex;
      align-items: center;
    }
    .header-search .search-icon {
      position: absolute;
      left: 1rem;
      color: #94a3b8;
    }
    .header-search input {
      width: 100%;
      padding: 0.6rem 1rem 0.6rem 2.5rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-main);
      font-size: 13px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s;
    }
    .header-search input:focus {
      border-color: #cbd5e1;
      background: var(--bg-card);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .notification-btn {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
    }
    .notification-btn .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 700;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .avatar {
      width: 32px;
      height: 32px;
      background: #6E56EB;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }
    .user-info {
      display: flex;
      flex-direction: column;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .user-email {
      font-size: 11px;
      color: var(--text-muted);
    }
    .page-container {
      flex: 1;
      padding: 2.5rem 2rem;
      overflow-y: auto;
      background: var(--bg-main);
      position: relative;
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
    private router = inject(Router);
    public authService = inject(AuthService);
    private adminService = inject(AdminService);

    notifications = signal<any[]>([]);
    unreadCount = signal(0);
    showNotifications = signal(false);
    private pollInterval: any;

    ngOnInit() {
        this.loadNotifications();
        // Start polling for admin notifications every 60 seconds
        this.pollInterval = setInterval(() => this.loadNotifications(), 60000);
        
        // Listen for global clicks to close dropdown
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

    ngOnDestroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }

    async loadNotifications() {
        try {
            const res = await this.adminService.getNotifications();
            if (res.success) {
                this.notifications.set(res.data || []);
                this.unreadCount.set(this.notifications().filter(n => !n.read).length);
            }
        } catch (error) {
            console.warn('Failed to load admin notifications');
        }
    }

    toggleNotifications(event: MouseEvent) {
        event.stopPropagation();
        this.showNotifications.set(!this.showNotifications());
    }

    handleOutsideClick(event: any) {
        if (this.showNotifications() && !event.target.closest('.notification-dropdown') && !event.target.closest('.notification-btn')) {
            this.showNotifications.set(false);
        }
    }

    async markAllRead() {
        try {
            await this.adminService.markNotificationsRead();
            this.loadNotifications(); // Refresh list
        } catch (error) {
            console.error('Failed to mark all as read');
        }
    }

    currentRoute() {
        const url = this.router.url;
        const parts = url.split('/');
        return parts[parts.length - 1] || 'Dashboard';
    }

    async handleLogout() {
        console.log('🛑 ADMIN LOGOUT INITIATED');
        try {
            await this.authService.logout();
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Session cleared - Redirecting to login');
            window.location.href = '/login';
        } catch (error) {
            console.error('❌ Logout failed:', error);
            window.location.href = '/login';
        }
    }
}
