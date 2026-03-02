/**
 * Storage Monitor Component
 * ==========================
 * Visualizes system-wide storage usage and file categories.
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-storage-monitor',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div class="storage-monitor">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold text-slate-900">Storage Monitor</h2>
        <div class="flex gap-2">
           <button class="btn-secondary text-xs" (click)="adminService.loadStats()">Refresh Data</button>
        </div>
      </div>

      <div *ngIf="!stats()" class="card p-12 text-center text-slate-400">
        Loading storage statistics...
      </div>

      <ng-container *ngIf="stats()">
        <!-- Capacity Card -->
        <div class="card bg-white shadow-sm p-8 mb-8 border-l-4 border-indigo-500">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex-1">
              <p class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">Total System Capacity</p>
              <div class="flex items-baseline gap-2">
                <h3 class="text-3xl font-bold text-slate-900">{{ formatFileSize(stats()?.totalStorageUsed || 0) }}</h3>
                <span class="text-slate-400">of {{ formatFileSize(stats()?.systemCapacity || 0) }} currently used</span>
              </div>
              
              <!-- Segmented bar: each color = its % of total capacity -->
              <div class="mt-6 w-full bg-slate-100 h-4 rounded-full overflow-hidden flex">
                 <div class="bg-indigo-500 h-full transition-all duration-700" [style.width.%]="getCategoryPercent('documents')"></div>
                 <div class="bg-blue-400 h-full transition-all duration-700" [style.width.%]="getCategoryPercent('images')"></div>
                 <div class="bg-purple-400 h-full transition-all duration-700" [style.width.%]="getCategoryPercent('videos')"></div>
                 <div class="bg-pink-400 h-full transition-all duration-700" [style.width.%]="getCategoryPercent('audio')"></div>
                 <div class="bg-slate-300 h-full transition-all duration-700" [style.width.%]="getCategoryPercent('other')"></div>
                 <!-- Remaining free space shown naturally by the gray bg-slate-100 -->
              </div>
              <!-- Total used bar as a single line below -->
              <div class="mt-2 text-xs text-slate-400 flex justify-between">
                <span>{{ getUsedPercent() | number:'1.2-2' }}% used</span>
                <span>{{ formatFileSize(stats()?.systemCapacity || 0) }} total capacity</span>
              </div>
              
              <div class="mt-4 flex flex-wrap gap-4 text-xs font-medium">
                 <div class="flex items-center gap-1.5 text-slate-600"><span class="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Documents ({{ formatFileSize(stats()?.storageBreakdown?.documents?.size || 0) }})</div>
                 <div class="flex items-center gap-1.5 text-slate-600"><span class="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Images ({{ formatFileSize(stats()?.storageBreakdown?.images?.size || 0) }})</div>
                 <div class="flex items-center gap-1.5 text-slate-600"><span class="w-2.5 h-2.5 rounded-sm bg-purple-400"></span> Videos ({{ formatFileSize(stats()?.storageBreakdown?.videos?.size || 0) }})</div>
                 <div class="flex items-center gap-1.5 text-slate-600"><span class="w-2.5 h-2.5 rounded-sm bg-pink-400"></span> Audio ({{ formatFileSize(stats()?.storageBreakdown?.audio?.size || 0) }})</div>
              </div>
            </div>
            
            <div class="w-full md:w-32 h-32 flex items-center justify-center border-4 border-indigo-50 rounded-full">
              <div class="text-center">
                <p class="text-2xl font-bold text-indigo-600">{{ stats()?.storagePercent || 0 }}%</p>
                <p class="text-[10px] uppercase font-bold text-slate-400">Utilized</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card bg-white shadow-sm p-6 flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h4 class="font-bold text-slate-900">Documents</h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ stats()?.storageBreakdown?.documents?.count || 0 }} files • {{ formatFileSize(stats()?.storageBreakdown?.documents?.size || 0) }}
            </p>
          </div>

          <div class="card bg-white shadow-sm p-6 flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h4 class="font-bold text-slate-900">Images</h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ stats()?.storageBreakdown?.images?.count || 0 }} files • {{ formatFileSize(stats()?.storageBreakdown?.images?.size || 0) }}
            </p>
          </div>

          <div class="card bg-white shadow-sm p-6 flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <h4 class="font-bold text-slate-900">Videos</h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ stats()?.storageBreakdown?.videos?.count || 0 }} files • {{ formatFileSize(stats()?.storageBreakdown?.videos?.size || 0) }}
            </p>
          </div>

          <div class="card bg-white shadow-sm p-6 flex flex-col items-center text-center">
            <div class="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
            </div>
            <h4 class="font-bold text-slate-900">Audio</h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ stats()?.storageBreakdown?.audio?.count || 0 }} files • {{ formatFileSize(stats()?.storageBreakdown?.audio?.size || 0) }}
            </p>
          </div>
        </div>

        <!-- Recently Uploaded Section -->
        <div class="card bg-white shadow-sm p-6">
          <h3 class="text-lg font-bold text-slate-900 mb-6">Recently Uploaded Files (Global)</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="text-xs text-slate-400 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th class="px-4 py-3">File Name</th>
                  <th class="px-4 py-3">User</th>
                  <th class="px-4 py-3">Type</th>
                  <th class="px-4 py-3">Size</th>
                  <th class="px-4 py-3">Upload Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let file of stats()?.recentFiles" class="text-sm">
                  <td class="px-4 py-4 font-medium flex items-center gap-3">
                    <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold uppercase overflow-hidden text-slate-500">
                      {{ file.fileType?.split('/')[1]?.substring(0,3) || '???' }}
                    </div>
                    <span class="truncate max-w-[200px] text-slate-700">{{ file.fileName }}</span>
                  </td>
                  <td class="px-4 py-4 text-slate-500 truncate max-w-[180px]">{{ file.userEmail }}</td>
                  <td class="px-4 py-4 text-xs text-slate-400">{{ file.fileType }}</td>
                  <td class="px-4 py-4 font-bold text-indigo-600">{{ formatFileSize(file.fileSize) }}</td>
                  <td class="px-4 py-4 text-slate-400">{{ file.uploadedAt | date:'short' }}</td>
                </tr>
                <tr *ngIf="!stats()?.recentFiles?.length">
                  <td colspan="5" class="py-12 text-center text-slate-300">No files found in system.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`:host { display: block; } .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`]
})
export class StorageMonitorComponent implements OnInit {
  public adminService = inject(AdminService);
  stats = this.adminService.stats;

  ngOnInit() { this.adminService.loadStats(); }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getCategoryPercent(cat: string): number {
    // Each segment = category size as % of SYSTEM CAPACITY (not used)
    const capacity = this.stats()?.systemCapacity || 1;
    const size = this.stats()?.storageBreakdown?.[cat]?.size || 0;
    return Math.min((size / capacity) * 100, 100);
  }

  getUsedPercent(): number {
    const capacity = this.stats()?.systemCapacity || 1;
    const used = this.stats()?.totalStorageUsed || 0;
    return Math.min((used / capacity) * 100, 100);
  }
}
