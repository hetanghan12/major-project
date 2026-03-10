import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-storage-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full w-full flex flex-col" *ngIf="!loading && stats">
      <!-- PAGE HEADER -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Storage Monitor</h1>
        <button (click)="loadData()" [disabled]="refreshing" class="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
          {{ refreshing ? 'Refreshing...' : 'Refresh Data' }}
        </button>
      </div>

      <!-- MAIN CAPACITY CARD -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex justify-between items-start mb-8">
          <div>
            <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total System Capacity</h2>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold text-gray-900">{{ formatBytes(stats.totalStorageBytes || 0) }}</span>
              <span class="text-sm font-medium text-gray-500">of 10 GB currently used</span>
            </div>
          </div>
          
          <!-- Circular Chart -->
          <div class="relative w-24 h-24">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <!-- Background Circle -->
              <path class="text-gray-100" stroke-width="3" stroke="currentColor" fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <!-- Progress Circle -->
              <path class="text-indigo-600 transition-all duration-1000 ease-out" 
                [attr.stroke-dasharray]="stats.storagePercentage + ', 100'" 
                stroke-linecap="round" stroke-width="3" stroke="currentColor" fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-lg font-bold text-indigo-600 leading-none">{{ (stats.storagePercentage || 0) | number:'1.0-1' }}%</span>
              <span class="text-[10px] font-semibold text-gray-500 mt-1">UTILIZED</span>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-3">
          <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="stats.storagePercentage || 0"></div>
          </div>
          <div class="flex justify-between items-center mt-2">
            <span class="text-xs font-medium text-gray-500">{{ stats.storagePercentage || 0 }}% used</span>
            <span class="text-xs font-medium text-gray-400">10 GB total capacity</span>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap items-center gap-6 mt-6">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-indigo-500"></div>
            <span class="text-xs font-medium text-gray-600">Documents ({{ formatBytes(stats.typeDistribution?.documents?.bytes || 0) }})</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-blue-400"></div>
            <span class="text-xs font-medium text-gray-600">Images ({{ formatBytes(stats.typeDistribution?.image?.bytes || 0) }})</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-purple-400"></div>
            <span class="text-xs font-medium text-gray-600">Videos ({{ formatBytes(stats.typeDistribution?.video?.bytes || 0) }})</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-pink-400"></div>
            <span class="text-xs font-medium text-gray-600">Audio ({{ formatBytes(stats.typeDistribution?.audio?.bytes || 0) }})</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-sm bg-gray-400"></div>
            <span class="text-xs font-medium text-gray-600">Other ({{ formatBytes(stats.typeDistribution?.other?.bytes || 0) }})</span>
          </div>
        </div>
      </div>

      <!-- CATEGORY CARDS -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <!-- Documents -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 mb-1">Documents</h3>
          <p class="text-xs text-gray-500 font-medium">{{ stats.typeDistribution?.documents?.count || 0 }} files • {{ formatBytes(stats.typeDistribution?.documents?.bytes || 0) }}</p>
        </div>

        <!-- Images -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 mb-1">Images</h3>
          <p class="text-xs text-gray-500 font-medium">{{ stats.typeDistribution?.image?.count || 0 }} files • {{ formatBytes(stats.typeDistribution?.image?.bytes || 0) }}</p>
        </div>

        <!-- Videos -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 mb-1">Videos</h3>
          <p class="text-xs text-gray-500 font-medium">{{ stats.typeDistribution?.video?.count || 0 }} files • {{ formatBytes(stats.typeDistribution?.video?.bytes || 0) }}</p>
        </div>

        <!-- Audio -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 mb-1">Audio</h3>
          <p class="text-xs text-gray-500 font-medium">{{ stats.typeDistribution?.audio?.count || 0 }} files • {{ formatBytes(stats.typeDistribution?.audio?.bytes || 0) }}</p>
        </div>

        <!-- Other -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
          <div class="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
          </div>
          <h3 class="text-sm font-bold text-gray-900 mb-1">Other</h3>
          <p class="text-xs text-gray-500 font-medium">{{ stats.typeDistribution?.other?.count || 0 }} files • {{ formatBytes(stats.typeDistribution?.other?.bytes || 0) }}</p>
        </div>
      </div>

      <!-- RECENT FILES TABLE -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 overflow-y-auto mb-6">
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="text-sm font-bold text-gray-900">Recently Uploaded Files (Global)</h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left whitespace-nowrap">
            <thead class="bg-white">
              <tr>
                <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">File Name</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">User</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">Type</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">Size</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">Upload Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              
              <tr *ngFor="let file of stats.recentDocs" class="hover:bg-gray-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded bg-gray-100 text-gray-400 flex items-center justify-center text-[10px] font-bold">
                      {{ (file.fileType || 'UNK').split('/')[1]?.substring(0,3)?.toUpperCase() || 'DOC' }}
                    </div>
                    <span class="text-sm font-medium text-gray-900 truncate max-w-[200px]">{{ file.fileName }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500 font-medium truncate max-w-[120px]">{{ file.user }}</td>
                <td class="px-6 py-4 text-sm text-gray-500 truncate max-w-[120px]">{{ file.fileType }}</td>
                <td class="px-6 py-4 text-sm font-bold text-indigo-600">{{ formatBytes(file.fileSize) }}</td>
                <td class="px-6 py-4 text-sm text-gray-500 font-medium">{{ file.createdAt | date:'short' }}</td>
              </tr>

              <tr *ngIf="!stats.recentDocs?.length">
                <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">No recent files found in the system.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div *ngIf="loading" class="h-full w-full flex items-center justify-center">
      <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class StorageMonitorComponent implements OnInit {
  private adminService = inject(AdminService);
  stats: any = null;
  loading = true;
  refreshing = false;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.refreshing = true;
    try {
      const res = await this.adminService.getUnifiedDashboardData();
      if (res.success) {
        const totalStorage = res.data.stats.totalStorageBytes || 0;
        const capacity = 10 * 1024 * 1024 * 1024; // 10GB hardcoded capacity

        this.stats = {
          ...res.data.stats,
          typeDistribution: res.data.typeDistribution,
          storagePercentage: Math.min(100, (totalStorage / capacity) * 100),
          recentDocs: res.data.recentActivity || []
        };
      }
    } catch (e) {
      console.error('Failed to load storage monitor data', e);
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
