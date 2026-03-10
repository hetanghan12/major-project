import { Component, OnInit, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { StorageService } from '../../core/services/storage.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <!-- Main app with sidebar -->
    <div class="app-layout" [attr.data-theme]="theme()">
      
      <!-- Mobile Overlay -->
      <div *ngIf="mobileOpen()" 
           class="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity backdrop-blur-sm"
           (click)="toggleMobileSidebar()">
      </div>

      <!-- Sidebar -->
      <aside class="sidebar" 
             [class.collapsed]="sidebarCollapsed()" 
             [class.mobile-open]="mobileOpen()">
             
        <!-- 1. Header (Fixed) -->
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="sidebar-logo-icon">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
            </div>
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-title">CloudSpace</span>
            </div>
          </div>
          <!-- Mobile Close Button -->
          <button class="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100" (click)="toggleMobileSidebar()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- 2. Menu (Scrollable) -->
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" 
             routerLinkActive="active" 
             [routerLinkActiveOptions]="{exact: true}"
             class="sidebar-nav-item dashboard-item"
             (click)="mobileOpen.set(false)">
            <div class="sidebar-nav-icon-container bg-white/20">
               <svg class="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
               </svg>
            </div>
            <span>Dashboard</span>
          </a>
          
          <a routerLink="/documents" 
             [class.active]="currentRoute.includes('/documents') && !currentRoute.includes('filter=')"
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <span>My Files</span>
          </a>

          <a (click)="navigateToStarred(); mobileOpen.set(false)" 
             class="sidebar-nav-item cursor-pointer"
             [class.active]="currentRoute.includes('filter=starred')">
            <svg class="sidebar-nav-icon text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <span>Starred</span>
          </a>

          <a routerLink="/documents" 
             [queryParams]="{filter: 'shared-with-me'}"
             class="sidebar-nav-item cursor-pointer"
             [class.active]="currentRoute.includes('filter=shared-with-me')"
             (click)="mobileOpen.set(false)">
            <div class="sidebar-nav-icon text-orange-400">
               <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
               </svg>
            </div>
            <span>Shared With Me</span>
          </a>

          <a routerLink="/documents"
             [queryParams]="{filter: 'shared-by-me'}"
             class="sidebar-nav-item cursor-pointer"
             [class.active]="currentRoute.includes('filter=shared-by-me')"
             (click)="mobileOpen.set(false)">
            <div class="sidebar-nav-icon text-blue-400">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
            </div>
            <span>Shared By Me</span>
          </a>

          <a (click)="navigateToTrash(); mobileOpen.set(false)" 
             class="sidebar-nav-item cursor-pointer"
             [class.active]="currentRoute.includes('filter=trash')">
             <svg class="sidebar-nav-icon text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
             </svg>
            <span>Trash</span>
          </a>
          
          <div class="my-4 border-t border-gray-100 opacity-20"></div>

          <a routerLink="/chat" 
             routerLinkActive="active" 
             class="sidebar-nav-item"
             (click)="mobileOpen.set(false)">
             <div class="sidebar-nav-icon ai-icon-gradient">
                 <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                 </svg>
             </div>
            <span>AI Assistant</span>
          </a>

          <a routerLink="/storage-insights"
             routerLinkActive="active"
             class="sidebar-nav-item" 
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
            <span>Storage Insights</span>
          </a>

          <a routerLink="/settings"
             routerLinkActive="active"
             class="sidebar-nav-item" 
             (click)="mobileOpen.set(false)">
            <svg class="sidebar-nav-icon text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Settings</span>
          </a>

          <a routerLink="/plans"
             routerLinkActive="active"
             class="sidebar-nav-item" 
             (click)="mobileOpen.set(false)">
             <svg class="sidebar-nav-icon text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
             </svg>
            <span>Plans</span>
          </a>

        </nav>

        <!-- 3. Footer (Fixed) -->
        <div class="sidebar-footer">
          
          <!-- CloudSpace Pro Card -->
          <div class="pro-card">
              <div class="pro-sparkle">
                  <svg class="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
              </div>
              <p class="pro-text">Get unlimited storage with <strong>CloudSpace Pro</strong></p>
              <button routerLink="/plans" class="upgrade-btn-pro">Upgrade</button>
          </div>

          <!-- Storage Indicator -->
          <div class="storage-indicator-minimal">
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-semibold" style="color: var(--text-secondary)">Storage Used</span>
                <span class="text-sm font-bold" style="color: var(--text-primary)">{{ storagePercent() }}%</span>
            </div>
            <div class="storage-bar h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div class="storage-bar-fill h-full rounded-full" [style.width.%]="storagePercent()"></div>
            </div>
            <div class="text-[12px] text-gray-500 font-medium tracking-wide">
              {{ usedStorage() }} of 5 GB used
            </div>
          </div>

          <div class="flex items-center justify-between mt-1">
            <!-- Logout -->
            <button (click)="logout()" class="logout-btn-sidebar pl-0 text-gray-500 hover:text-red-500 flex items-center gap-2 transition-colors flex-1">
                <div class="w-1 h-4 bg-orange-400 rounded-full mr-2"></div>
                <span class="logout-text">Logout</span>
            </button>
            
            <!-- Dark Mode Toggle -->
            <button (click)="toggleTheme()" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors" title="Toggle Theme">
               <svg *ngIf="theme() === 'light'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
               </svg>
               <svg *ngIf="theme() === 'dark'" class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
               </svg>
            </button>
          </div>

        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content" [class.sidebar-collapsed]="sidebarCollapsed()">
        <!-- Top Header -->
        <header class="main-header">
          <div class="header-left">
            <!-- Expand sidebar button (when collapsed) -->
            <button *ngIf="sidebarCollapsed() && !mobileOpen()" (click)="toggleSidebar()" class="btn-ghost p-2 max-md:hidden">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            
            <!-- Mobile Toggle Button -->
            <button (click)="toggleMobileSidebar()" class="md:hidden btn-ghost p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <!-- Search -->
          <div class="search-container">
            <div class="search-input">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search files, folders, or ask AI..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearch()"
                (keyup.enter)="onSearch()"
              />
            </div>
          </div>

          <div class="header-right">
            <!-- AI Assistant Button -->
            <button class="ai-assistant-btn" (click)="toggleAIPanel()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <span>AI Assistant</span>
            </button>

            <!-- Notifications -->
            <button class="notification-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span class="notification-badge">2</span>
            </button>

            <!-- User Profile -->
            <div class="user-profile" (click)="toggleUserMenu()">
              <div class="user-avatar overflow-hidden flex items-center justify-center">
                <img *ngIf="authService.currentUser()?.photoURL" [src]="authService.currentUser()?.photoURL" alt="Profile" class="w-full h-full object-cover">
                <span *ngIf="!authService.currentUser()?.photoURL">{{ getInitials(authService.currentUser()?.displayName || authService.currentUser()?.email) }}</span>
              </div>
              <div class="user-info">
                <p class="user-name">{{ getUserName() }}</p>
                <p class="user-email">{{ authService.currentUser()?.email }}</p>
              </div>
              <svg class="w-4 h-4" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>

            <!-- User Menu Dropdown -->
            <div *ngIf="showUserMenu()" class="absolute right-6 top-16 mt-2 p-2 rounded-xl card shadow-lg z-50 w-48 border border-gray-100">
              
              <!-- ADMIN LINK -->
              <button 
                *ngIf="isAdmin()"
                routerLink="/admin"
                (click)="showUserMenu.set(false)"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors hover:bg-indigo-50 text-indigo-700 mb-1 font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Admin Panel
              </button>

              <button 
                (click)="logout()" 
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-colors hover:bg-red-50"
                style="color: var(--danger);">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- AI Assistant Panel Overlay -->
      <div class="ai-panel-overlay" [class.open]="showAIPanel()" (click)="toggleAIPanel()"></div>

      <!-- AI Assistant Panel -->
      <aside class="ai-panel" [class.open]="showAIPanel()">
        <div class="flex h-full">
          <!-- Chat History Sidebar -->
          <div class="ai-panel-sidebar">
            <div class="p-3">
              <button class="btn-primary w-full text-sm py-2" (click)="newAIChat()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                New Chat
              </button>
            </div>
            <div class="ai-chat-history">
              <div *ngFor="let chat of aiChatHistory()" 
                   class="ai-chat-history-item"
                   [class.active]="chat.id === selectedAIChatId()"
                   (click)="selectAIChat(chat.id)">
                <p class="text-sm truncate">{{ chat.title }}</p>
                <p class="text-xs opacity-60 mt-0.5">{{ chat.date }}</p>
              </div>
            </div>
          </div>

          <!-- Main Chat Area -->
          <div class="ai-panel-content">
            <!-- Header -->
            <div class="ai-panel-header">
              <div class="ai-panel-title">
                <div class="ai-panel-avatar">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <div class="ai-panel-info">
                  <h3>Smart AI Assistant</h3>
                  <div class="ai-panel-status">
                    <span class="ai-panel-status-dot"></span>
                    Ready
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button class="ai-panel-close" title="Saved items">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </button>
                <button class="ai-panel-close" title="Refresh" (click)="refreshAIChat()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
                <button class="ai-panel-close" (click)="toggleAIPanel()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div class="ai-messages">
              <div class="ai-message ai-message-assistant">
                <p class="mb-3">Welcome! I'm your Smart AI Assistant. I can help you:</p>
                <div class="ai-features-list">
                  <div class="ai-feature-item">
                    <span>💾</span>
                    <span><strong>Save & remember</strong> your conversations</span>
                  </div>
                  <div class="ai-feature-item">
                    <span>📄</span>
                    <span><strong>Scan content</strong> - paste text, URLs, or file content</span>
                  </div>
                  <div class="ai-feature-item">
                    <span>🔍</span>
                    <span><strong>Search</strong> through everything you've saved</span>
                  </div>
                  <div class="ai-feature-item">
                    <span>💡</span>
                    <span><strong>Answer questions</strong> from your stored knowledge</span>
                  </div>
                  <div class="ai-feature-item">
                    <span>📊</span>
                    <span><strong>Summarize</strong> your documents</span>
                  </div>
                </div>
                <p class="mt-4 text-sm opacity-80">
                  All your data is stored <strong>locally in your browser</strong> by your username - completely private and FREE!
                </p>
                <div class="mt-4 p-3 rounded-lg" style="background: rgba(255,255,255,0.1);">
                  <p class="text-sm font-medium mb-2">Try these commands:</p>
                  <p class="text-sm opacity-80">- Type <strong>"scan:"</strong> followed by any text to save it</p>
                  <p class="text-sm opacity-80">- Type <strong>"search:"</strong> followed by keywords to find saved content</p>
                  <p class="text-sm opacity-80">- Ask any question and I'll search your knowledge base!</p>
                </div>
                <p class="text-xs opacity-50 mt-3">02:11 pm</p>
              </div>
            </div>

            <!-- Saved Items Counter -->
            <div class="px-4 py-2 flex items-center gap-2 text-white/60 text-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              <span>Saved: {{ savedItemsCount() }} items</span>
            </div>

            <!-- Quick Actions -->
            <div class="ai-actions px-4">
              <button class="ai-action-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Scan
              </button>
              <button class="ai-action-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Search
              </button>
              <button class="ai-action-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h7"/>
                </svg>
                My Content
              </button>
              <button class="ai-action-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Summary
              </button>
              <button class="ai-action-btn">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Export
              </button>
            </div>

            <!-- Input Area -->
            <div class="ai-input-area">
              <div class="ai-input-container">
                <input 
                  type="text" 
                  class="ai-input"
                  placeholder="Ask anything, or use 'scan:' to save content..."
                  [(ngModel)]="aiMessage"
                  (keyup.enter)="sendAIMessage()"
                />
                <button class="ai-send-btn" (click)="sendAIMessage()">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100%;
    }
  `]
})
export class UserLayoutComponent implements OnInit {
  searchQuery = '';
  aiMessage = '';
  showUserMenu = signal(false);
  showAIPanel = signal(false);
  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);
  theme = signal<'light' | 'dark'>('light');

  currentRoute = '';
  savedItemsCount = signal(0);
  selectedAIChatId = signal<string | null>('1');

  // Storage - now computed from the unified dashboard service
  storagePercent = computed(() => this.dashboardService.dashboardData()?.stats.percentUsed || 0);

  usedStorage = computed(() => {
    const bytes = this.dashboardService.dashboardData()?.stats.totalStorageUsed || 0;
    return this.formatFileSize(bytes);
  });

  aiChatHistory = signal([
    { id: '1', title: 'Conversation 30/12/2025', date: 'Yesterday' },
  ]);

  constructor(
    public authService: AuthService,
    private documentService: DocumentService,
    private dashboardService: DashboardService,
    private router: Router
  ) {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
      // Close mobile sidebar on route change
      this.mobileOpen.set(false);
    });

    // CRITICAL: Auto-sync storage when documents change
    // This uses effect() to react to signal changes, just like Dashboard
    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.theme.set(savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    }
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.dashboardService.getUnifiedDashboard().subscribe();
    }
  }



  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getInitials(email: string | null | undefined): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  }

  getUserName(): string {
    const user = this.authService.currentUser();
    if (user?.displayName) return user.displayName;
    const email = user?.email;
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.split(/[._-]/).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  isAdmin(): boolean {
    const user = this.authService.currentUser();
    const role = user?.role?.toLowerCase();
    return role === 'admin' || user?.email === 'admin@cloudspace.com';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  toggleMobileSidebar(): void {
    this.mobileOpen.set(!this.mobileOpen());
  }

  toggleTheme(): void {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  toggleUserMenu(): void {
    this.showUserMenu.set(!this.showUserMenu());
  }

  toggleAIPanel(): void {
    this.showAIPanel.set(!this.showAIPanel());
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/documents'], {
        queryParams: { search: this.searchQuery },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate(['/documents'], {
        queryParams: { search: null },
        queryParamsHandling: 'merge'
      });
    }
  }

  navigateToRecent(): void {
    this.router.navigate(['/documents'], { queryParams: { filter: 'recent' } });
  }

  navigateToStarred(): void {
    this.router.navigate(['/documents'], { queryParams: { filter: 'starred' } });
  }

  navigateToTrash(): void {
    this.router.navigate(['/documents'], { queryParams: { filter: 'trash' } });
  }

  // AI Panel methods
  newAIChat(): void {
    const newId = Date.now().toString();
    const currentHistory = this.aiChatHistory();
    this.aiChatHistory.set([
      { id: newId, title: 'New Conversation', date: 'Just now' },
      ...currentHistory
    ]);
    this.selectedAIChatId.set(newId);
  }

  selectAIChat(id: string): void {
    this.selectedAIChatId.set(id);
  }

  refreshAIChat(): void {
    // Refresh chat logic
  }

  sendAIMessage(): void {
    if (!this.aiMessage.trim()) return;
    // Send message logic - integrate with chat service
    this.aiMessage = '';
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.showUserMenu.set(false);
    this.router.navigate(['/login']);
  }
}
