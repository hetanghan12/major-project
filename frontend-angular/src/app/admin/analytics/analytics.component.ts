/**
 * Analytics Component
 * ===================
 * Detailed system engagement and traffic metrics.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
          <p class="text-slate-500 text-sm mt-1">System-wide engagement and storage metrics</p>
        </div>
        <div class="flex gap-2">
            <button (click)="load()" class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Refresh</button>
            <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Download PDF</button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="card p-12 text-center text-slate-400">
        <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Fetching real-time analytics...</p>
      </div>

      <!-- Content -->
      <ng-container *ngIf="!loading() && adminService.analytics()">
        
        <!-- Key Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card p-6 bg-white border border-slate-100 shadow-sm">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ adminService.analytics().totalUsers }}</h3>
            <div class="flex items-center gap-1 mt-2 text-xs text-green-500 font-medium">
              <span>Lifetime Growth</span>
            </div>
          </div>
          
          <div class="card p-6 bg-white border border-slate-100 shadow-sm">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Files</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ adminService.analytics().totalFiles }}</h3>
            <div class="flex items-center gap-1 mt-2 text-xs text-indigo-500 font-medium">
              <span>Active Storage Items</span>
            </div>
          </div>

          <div class="card p-6 bg-white border border-slate-100 shadow-sm">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Storage</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ formatSize(adminService.analytics().totalStorage) }}</h3>
            <div class="flex items-center gap-1 mt-2 text-xs text-amber-500 font-medium">
              <span>Cloud Utilization</span>
            </div>
          </div>

          <div class="card p-6 bg-white border border-slate-100 shadow-sm">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Active Users</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ adminService.analytics().dau }}</h3>
            <div class="flex items-center gap-1 mt-2 text-xs text-blue-500 font-medium">
              <span>Last 24 Hours</span>
            </div>
          </div>
        </div>

        <!-- Breakdown Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="card p-6 bg-white border border-slate-100 shadow-sm">
            <h3 class="font-bold text-slate-900 mb-6 font-semibold">File Type Distribution</h3>
            <div class="space-y-4">
              <div *ngFor="let entry of getSortedDistribution()" class="group">
                <div class="flex justify-between text-sm mb-1.5">
                  <span class="text-slate-600 capitalize font-medium">{{ entry.key }}</span>
                  <span class="text-slate-900 font-bold">{{ entry.value }} Files</span>
                </div>
                <div class="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors" 
                       [style.width.%]="(entry.value / adminService.analytics().totalFiles) * 100 || 0"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="card p-6 bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
              </svg>
            </div>
            <h3 class="font-bold text-slate-900 mb-2 font-semibold">Activity Trend Ready</h3>
            <p class="text-sm text-slate-500 max-w-xs">Detailed engagement charts are being prepared. Refresh to see the latest system logs.</p>
            <button (click)="load()" class="mt-4 px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">
              Update Charts
            </button>
          </div>
        </div>

      </ng-container>

      <!-- Empty State -->
      <div *ngIf="!loading() && (!adminService.analytics() || adminService.analytics().totalUsers === 0)" 
           class="card p-12 text-center text-slate-400 bg-white shadow-sm border border-slate-100">
        <svg class="w-12 h-12 mx-auto mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p class="font-bold text-slate-900">Analytics are currently empty</p>
        <p class="text-sm mt-1">Engage with the system to see real-time engagement and growth tracking.</p>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AnalyticsComponent implements OnInit {
  adminService = inject(AdminService);
  loading = signal(true);

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    await this.adminService.loadAnalytics();
    this.loading.set(false);
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getSortedDistribution() {
    const dist = this.adminService.analytics()?.typeDistribution || {};
    return Object.entries(dist)
      .map(([key, value]) => ({ key, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }
}
