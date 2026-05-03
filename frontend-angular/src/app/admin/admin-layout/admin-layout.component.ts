import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
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
                <a routerLink="dashboard" [class.active]="activeRoute === 'dashboard'">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span>Dashboard</span>
                </a>
              </li>
              <li>
                <a routerLink="users" [class.active]="activeRoute === 'users'">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>User Management</span>
                </a>
              </li>
              <li>
                <a routerLink="storage" [class.active]="activeRoute === 'storage'">
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                  <span>Storage Monitor</span>
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
             <h2 class="header-title">Admin Control Center</h2>
           </div>

           <div class="header-actions">
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
    :host { display: block; height: 100vh; font-family: 'Inter', sans-serif; background: #fdfdfd; }
    .admin-container { display: flex; height: 100%; }
    .sidebar { width: 260px; background: #ffffff; border-right: 1px solid #f1f1f1; display: flex; flex-direction: column; }
    .sidebar-header { padding: 1.5rem; border-bottom: 1px solid #f1f1f1; }
    .logo-box { display: flex; align-items: center; gap: 12px; }
    .logo-text { font-size: 16px; font-weight: 700; color: #111827; }
    .nav-content { flex: 1; padding: 1.5rem 1rem; }
    .nav-links { list-style: none; padding: 0; }
    .nav-links a { display: flex; align-items: center; gap: 12px; padding: 0.75rem 1.25rem; text-decoration: none; color: #64748b; font-size: 14px; border-radius: 8px; transition: 0.2s; }
    .nav-links a:hover, .nav-links a.active { background: #faf9ff; color: #6E56EB; }
    .icon { width: 18px; height: 18px; }
    .sidebar-footer { padding: 1rem; border-top: 1px solid #f1f1f1; }
    .back-link { width: 100%; display: flex; align-items: center; gap: 12px; padding: 0.8rem 1.25rem; background: transparent; border: none; color: #ef4444; font-weight: 600; cursor: pointer; }
    .main-content { flex: 1; display: flex; flex-direction: column; }
    .admin-header { height: 72px; padding: 0 2rem; border-bottom: 1px solid #f1f1f1; display: flex; align-items: center; justify-content: space-between; }
    .user-profile { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 32px; height: 32px; background: #6E56EB; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 13px; font-weight: 600; }
    .user-email { font-size: 11px; color: #94a3b8; }
    .page-container { flex: 1; padding: 2rem; background: #fafafb; overflow-y: auto; }
  `]
})
export class AdminLayoutComponent implements OnInit {
  activeRoute = 'dashboard';
  private router = inject(Router);
  public authService = inject(AuthService);

  ngOnInit() {
    // Handle route highlighting
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const parts = event.urlAfterRedirects.split('/');
      this.activeRoute = parts[parts.length - 1] || 'dashboard';
    });
  }

  async handleLogout() {
    console.log('🛑 [AdminLayout] Logout clicked');
    await this.authService.logout();
    window.location.href = '/login';
  }
}
