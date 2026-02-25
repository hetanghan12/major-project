/**
 * Audit Logs Component
 * =====================
 * System-wide activity tracking and security monitoring.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-logs">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Security Audit Logs</h2>
          <p class="text-slate-500 text-sm mt-1">Track all administrative and user activity</p>
        </div>
        <div class="flex gap-2">
          <button (click)="load()" class="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm">
            <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div class="card bg-white overflow-hidden shadow-sm">

        <!-- Filters -->
        <div class="p-4 border-b border-slate-100 bg-slate-50 flex gap-3">
          <input [(ngModel)]="filterText" type="text"
                 placeholder="Filter by event or user..."
                 class="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <select [(ngModel)]="filterStatus"
                  class="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <!-- Loading -->
        <div *ngIf="loading()" class="py-16 text-center text-slate-400">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading audit logs...</p>
        </div>

        <!-- Table -->
        <div *ngIf="!loading()" class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Event Type</th>
                <th class="px-6 py-4">User</th>
                <th class="px-6 py-4">IP Address</th>
                <th class="px-6 py-4">Timestamp</th>
                <th class="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let log of filteredLogs()"
                  class="hover:bg-slate-50 transition-colors text-sm">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0"
                          [class.bg-emerald-500]="log.status === 'Success'"
                          [class.bg-red-500]="log.status === 'Failed'"
                          [class.bg-slate-300]="!log.status"></span>
                    <span class="font-medium text-slate-700">{{ log.event || '—' }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-slate-600">{{ log.user || 'System' }}</td>
                <td class="px-6 py-4 text-xs font-mono text-slate-400">{{ log.ipAddress || '—' }}</td>
                <td class="px-6 py-4 text-slate-500">{{ log.timestamp | date:'d MMM y, HH:mm:ss' }}</td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        [class.bg-emerald-100]="log.status === 'Success'"
                        [class.text-emerald-700]="log.status === 'Success'"
                        [class.bg-red-100]="log.status === 'Failed'"
                        [class.text-red-700]="log.status === 'Failed'"
                        [class.bg-slate-100]="!log.status"
                        [class.text-slate-500]="!log.status">
                    {{ log.status || 'Info' }}
                  </span>
                </td>
              </tr>

              <!-- Empty state -->
              <tr *ngIf="!filteredLogs().length">
                <td colspan="5" class="px-6 py-16 text-center">
                  <svg class="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  <p class="text-slate-400 text-sm">
                    {{ filterText || filterStatus ? 'No logs match your filter' : 'No audit logs recorded yet' }}
                  </p>
                  <p *ngIf="filterText || filterStatus" class="text-xs text-slate-300 mt-1">Try clearing the filters</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div *ngIf="!loading()" class="px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 bg-slate-50">
          <span>
            Showing <strong>{{ filteredLogs().length }}</strong> of <strong>{{ adminService.logs().length }}</strong> logs
            <span *ngIf="filterText || filterStatus" class="text-indigo-500">(filtered)</span>
          </span>
          <button *ngIf="filterText || filterStatus" (click)="clearFilter()" class="text-indigo-500 hover:underline text-xs">
            Clear filter
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AuditLogsComponent implements OnInit {
  adminService  = inject(AdminService);
  loading       = signal(true);
  filterText    = '';
  filterStatus  = '';

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    await this.adminService.loadLogs();
    this.loading.set(false);
  }

  filteredLogs() {
    return this.adminService.logs().filter(log => {
      const matchText = !this.filterText ||
        (log.event || '').toLowerCase().includes(this.filterText.toLowerCase()) ||
        (log.user  || '').toLowerCase().includes(this.filterText.toLowerCase());
      const matchStatus = !this.filterStatus || log.status === this.filterStatus;
      return matchText && matchStatus;
    });
  }

  clearFilter() {
    this.filterText   = '';
    this.filterStatus = '';
  }
}
