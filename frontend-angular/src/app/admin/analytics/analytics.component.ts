import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="h-full w-full flex flex-col" *ngIf="!loading && stats">
      <!-- PAGE HEADER -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p class="text-sm text-gray-500 mt-1">System-wide engagement and storage metrics</p>
        </div>
        <div class="flex gap-3">
          <button (click)="loadData()" [disabled]="refreshing" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50">
            {{ refreshing ? 'Refreshing...' : 'Refresh' }}
          </button>
          <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
            Download PDF
          </button>
        </div>
      </div>

      <!-- METRICS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <!-- Total Users -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Total Users</h3>
          <div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{{ stats.totalUsers || 0 }}</div>
            <div class="text-xs font-semibold text-emerald-500">Lifetime Growth</div>
          </div>
        </div>

        <!-- Total Files -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Total Files</h3>
          <div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{{ stats.totalDocuments || 0 }}</div>
            <div class="text-xs font-semibold text-indigo-500">Active Storage Items</div>
          </div>
        </div>

        <!-- Total Storage -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Total Storage</h3>
          <div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{{ formatBytes(stats.totalStorageBytes || 0) }}</div>
            <div class="text-xs font-semibold text-amber-500">Cloud Utilization</div>
          </div>
        </div>

        <!-- Daily Active Users -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Daily Active Users</h3>
          <div>
            <div class="text-3xl font-bold text-gray-900 mb-2">{{ stats.activeUsers24h || 0 }}</div>
            <div class="text-xs font-semibold text-blue-500">Last 24 Hours</div>
          </div>
        </div>

      </div>

      <!-- LOWER SPLIT CONTAINERS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        
        <!-- Left Column: File Type Distribution -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 class="text-sm font-bold text-gray-900 mb-6">File Type Distribution</h3>
          
          <div class="flex-1 space-y-6 overflow-y-auto pr-2">
            
            <div class="flex flex-col" [class.opacity-50]="!stats.typeDistribution?.other?.count">
              <div class="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>Other</span>
                <span>{{ stats.typeDistribution?.other?.count || 0 }} Files</span>
              </div>
              <div class="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.typeDistribution?.other?.count, stats.totalDocuments)"></div>
              </div>
            </div>

            <div class="flex flex-col" [class.opacity-50]="!stats.typeDistribution?.documents?.count">
              <div class="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>Documents</span>
                <span>{{ stats.typeDistribution?.documents?.count || 0 }} Files</span>
              </div>
              <div class="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.typeDistribution?.documents?.count, stats.totalDocuments)"></div>
              </div>
            </div>

            <div class="flex flex-col" [class.opacity-50]="!stats.typeDistribution?.image?.count">
              <div class="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>Images</span>
                <span>{{ stats.typeDistribution?.image?.count || 0 }} Files</span>
              </div>
              <div class="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.typeDistribution?.image?.count, stats.totalDocuments)"></div>
              </div>
            </div>

            <div class="flex flex-col" [class.opacity-50]="!stats.typeDistribution?.video?.count">
              <div class="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>Videos</span>
                <span>{{ stats.typeDistribution?.video?.count || 0 }} Files</span>
              </div>
              <div class="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.typeDistribution?.video?.count, stats.totalDocuments)"></div>
              </div>
            </div>

            <div class="flex flex-col" [class.opacity-50]="!stats.typeDistribution?.audio?.count">
              <div class="flex justify-between text-xs font-bold text-gray-700 mb-2">
                <span>Audio</span>
                <span>{{ stats.typeDistribution?.audio?.count || 0 }} Files</span>
              </div>
              <div class="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.typeDistribution?.audio?.count, stats.totalDocuments)"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- Right Column: Activity Trend -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full min-h-[300px]">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-sm font-bold text-gray-900">Activity Trend</h3>
            <span class="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md">Last 7 Days</span>
          </div>
          
          <div class="flex-1 w-full relative">
            <canvas *ngIf="isChartReady" baseChart
              [data]="lineChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
            
            <div *ngIf="!isChartReady && !refreshing" class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Waiting for chart data...
            </div>
            
            <div *ngIf="refreshing" class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px] z-10">
               <svg class="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                 <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                 <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            </div>
          </div>
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
export class ReportsComponent implements OnInit {
  private adminService = inject(AdminService);
  stats: any = null;
  loading = true;
  refreshing = false;

  // Chart configurations
  isChartReady = false;
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        label: 'Storage Used (MB)',
        fill: true,
        tension: 0.4,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4f46e5'
      }
    ]
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 13, family: 'Inter' },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af' }
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#9ca3af', callback: (value: any) => value + ' MB' }
      }
    }
  };

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.refreshing = true;
    try {
      // Execute both requests in parallel for better performance
      const [unifiedRes, activityRes] = await Promise.all([
        this.adminService.getUnifiedDashboardData(),
        this.adminService.getStorageActivity()
      ]);

      if (unifiedRes.success) {
        this.stats = {
          ...unifiedRes.data.stats,
          typeDistribution: unifiedRes.data.typeDistribution,
          activeUsers24h: unifiedRes.data.stats.activeUsers24h || 0
        };
      }

      if (activityRes.success && activityRes.data?.storageActivity) {
        const chartData = activityRes.data.storageActivity;

        // Update Chart Data with fresh values
        this.lineChartData = {
          labels: chartData.map((d: any) => d.day),
          datasets: [{
            ...this.lineChartData.datasets[0],
            data: chartData.map((d: any) => Number((d.bytes / (1024 * 1024)).toFixed(2)))
          }]
        };
        this.isChartReady = true;
      }
    } catch (e) {
      console.error('Failed to load analytics data', e);
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

  getPercentage(part: number, total: number) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
  }
}
