/**
 * Admin Dashboard Component
 * ==========================
 * System overview with real Firestore stats, charts and activity feed.
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-dashboard">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">System Overview</h2>
          <p class="text-slate-500 text-sm">Real-time cloud monitoring and user analytics</p>
        </div>
        <button (click)="load()" class="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
          <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <ng-container *ngIf="loading()">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div *ngFor="let _ of [1,2,3,4]" class="stat-card bg-white shadow-sm border border-slate-100 animate-pulse">
            <div class="w-12 h-12 bg-slate-100 rounded-xl"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 bg-slate-100 rounded w-20"></div>
              <div class="h-6 bg-slate-100 rounded w-12"></div>
            </div>
          </div>
        </div>
        <div class="card p-6 animate-pulse h-64 bg-white shadow-sm"></div>
      </ng-container>

      <!-- Dashboard Content -->
      <ng-container *ngIf="!loading() && stats()">
        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div class="stat-card bg-white shadow-sm border border-slate-100">
            <div class="stat-icon bg-blue-50 text-blue-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div class="stat-content">
              <p class="stat-label">Total Users</p>
              <h3 class="stat-value">{{ stats()!.totalUsers }}</h3>
              <p class="stat-trend text-green-500">{{ stats()!.userTrend || '+0' }} today</p>
            </div>
          </div>

          <div class="stat-card bg-white shadow-sm border border-slate-100">
            <div class="stat-icon bg-purple-50 text-purple-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
            </div>
            <div class="stat-content">
              <p class="stat-label">Storage Used</p>
              <h3 class="stat-value">{{ fmt(stats()!.totalStorageUsed) }}</h3>
              <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div class="bg-purple-500 h-full rounded-full" [style.width.%]="stats()!.storagePercent"></div>
              </div>
            </div>
          </div>

          <div class="stat-card bg-white shadow-sm border border-slate-100">
            <div class="stat-icon bg-amber-50 text-amber-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div class="stat-content">
              <p class="stat-label">Total Files</p>
              <h3 class="stat-value">{{ stats()!.documentCount }}</h3>
              <p class="stat-trend text-amber-500">{{ stats()!.publicLinksCount }} public</p>
            </div>
          </div>

          <div class="stat-card bg-white shadow-sm border border-slate-100">
            <div class="stat-icon bg-emerald-50 text-emerald-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div class="stat-content">
              <p class="stat-label">Active (24h)</p>
              <h3 class="stat-value">{{ stats()!.activeRequests }}</h3>
              <p class="stat-trend text-emerald-500">System Stable</p>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <!-- Storage Growth Bar Chart -->
          <div class="lg:col-span-2 card bg-white p-6 shadow-sm">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-slate-900">Storage Activity (Last 7 Days)</h3>
              <span class="flex items-center gap-1.5 text-xs text-slate-400"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>Bytes uploaded</span>
            </div>
            <div class="h-52 flex items-end gap-2 border-b border-slate-100 pb-1">
              <div *ngFor="let v of stats()!.growth; let i = index"
                   class="flex-1 rounded-t-md bg-indigo-500 hover:bg-indigo-600 transition-all cursor-default relative group"
                   [style.height.%]="growthH(v)">
                <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {{ fmt(v) }}
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-3 text-[10px] text-slate-400 font-medium uppercase">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          <!-- System Logs -->
          <div class="card bg-white p-6 shadow-sm flex flex-col">
            <h3 class="font-bold text-slate-900 mb-4">Recent Activity</h3>
            <div class="flex-1 space-y-3 overflow-y-auto" style="max-height: 220px;">
              <ng-container *ngIf="stats()!.recentActivity?.length; else noLogs">
                <div *ngFor="let log of stats()!.recentActivity" class="flex items-start gap-3">
                  <div class="mt-1 w-1.5 h-6 rounded-full flex-shrink-0"
                       [class.bg-emerald-400]="log.event?.includes('LOGIN')"
                       [class.bg-blue-400]="log.event?.includes('UPLOAD') || log.event?.includes('FILE')"
                       [class.bg-red-400]="log.event?.includes('DELETE')"
                       [class.bg-orange-400]="log.event?.includes('UPDATE') || log.event?.includes('SETTINGS')"
                       [class.bg-slate-300]="!log.event?.includes('LOGIN') && !log.event?.includes('UPLOAD') && !log.event?.includes('FILE') && !log.event?.includes('DELETE') && !log.event?.includes('UPDATE')">
                  </div>
                  <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ log.event }}</p>
                    <p class="text-xs text-slate-700 truncate">{{ log.user || 'System' }}</p>
                  </div>
                </div>
              </ng-container>
              <ng-template #noLogs>
                <p class="text-center text-slate-300 text-sm py-8">No activity yet</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Storage Breakdown -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div *ngFor="let c of breakdown()" class="card bg-white p-5 shadow-sm text-center">
            <div class="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" [ngClass]="c.bg">
              <svg class="w-4 h-4" [ngClass]="c.icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p class="text-[10px] text-slate-400 uppercase font-bold">{{ c.label }}</p>
            <p class="text-xl font-bold text-slate-800 mt-0.5">{{ c.count }}</p>
            <p class="text-[10px] text-slate-500 mt-0.5">{{ fmt(c.size) }}</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .stat-card { background:white; padding:1.5rem; border-radius:1rem; box-shadow:0 1px 4px rgba(0,0,0,.06); display:flex; align-items:center; gap:1.25rem; }
    .stat-icon  { width:3rem; height:3rem; border-radius:.75rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stat-label { font-size:.8rem; color:#6b7280; font-weight:500; }
    .stat-value { font-size:1.5rem; font-weight:700; color:#111827; margin-top:.1rem; }
    .stat-trend { font-size:.7rem; margin-top:.2rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private svc = inject(AdminService);
  stats   = this.svc.stats;
  loading = signal(true);

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    await this.svc.loadStats();
    this.loading.set(false);
  }

  breakdown() {
    const b = this.stats()?.storageBreakdown || {};
    const cats = [
      { label:'Documents', key:'documents', bg:'bg-indigo-50', icon:'text-indigo-500' },
      { label:'Images',    key:'images',    bg:'bg-blue-50',   icon:'text-blue-500'   },
      { label:'Videos',    key:'videos',    bg:'bg-purple-50', icon:'text-purple-500' },
      { label:'Audio',     key:'audio',     bg:'bg-pink-50',   icon:'text-pink-500'   },
      { label:'Other',     key:'other',     bg:'bg-slate-50',  icon:'text-slate-400'  },
    ];
    return cats.map(c => ({ ...c, count: b[c.key]?.count ?? 0, size: b[c.key]?.size ?? 0 }));
  }

  growthH(v: number) {
    const max = Math.max(...(this.stats()?.growth ?? [1]), 1);
    return Math.max(Math.round((v / max) * 100), 2);
  }

  fmt(b: number) {
    if (!b) return '0 B';
    const k = 1024, s = ['B','KB','MB','GB','TB'], i = Math.floor(Math.log(b)/Math.log(k));
    return (b/Math.pow(k,i)).toFixed(1) + ' ' + s[i];
  }
}
