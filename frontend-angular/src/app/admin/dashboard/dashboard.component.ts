import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Top Stats Row -->
    <div class="dashboard-header">
      <h2>System Overview</h2>
      <p>Real-time cloud monitoring and user analytics</p>
      
      <button (click)="loadData()" [disabled]="refreshing" class="refresh-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" [class.animate-spin]="refreshing"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
      </button>
    </div>

    <div class="stats-grid top-tiles" *ngIf="!loading; else spinner">
      <div class="card stat">
        <div class="stat-icon users-icon-bg">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <h3>Total Users</h3>
          <p class="number">{{ stats?.data?.totalUsers || 0 }}</p>
          <span class="subtext text-green">+0 today</span>
        </div>
      </div>

      <div class="card stat">
        <div class="stat-icon storage-icon-bg">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
        </div>
        <div class="stat-info">
          <h3>Storage Used</h3>
          <p class="number">{{ formatBytes(stats?.data?.totalStorageBytes || 0) }}</p>
          <div class="progress tiny">
            <div class="progress-bar transition-all duration-1000" [style.width.%]="stats?.data?.storagePercentage || 1"></div>
          </div>
        </div>
      </div>
      
      <div class="card stat">
        <div class="stat-icon files-icon-bg">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </div>
        <div class="stat-info">
          <h3>Total Files</h3>
          <p class="number">{{ stats?.data?.totalDocuments || 0 }}</p>
          <span class="subtext text-yellow">AWS S3 Server</span>
        </div>
      </div>

      <div class="card stat">
        <div class="stat-icon active-icon-bg">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </div>
        <div class="stat-info">
          <h3>Active (24h)</h3>
          <p class="number">{{ stats?.data?.activeUsers24h || 0 }}</p>
          <span class="subtext text-green">System Stable</span>
        </div>
      </div>
    </div>

    <!-- Charts / Performance Area -->
    <div class="dashboard-middle" *ngIf="!loading">
      <div class="card chart-area flex flex-col items-stretch overflow-hidden">
        <div class="card-header">
          <h3>Storage Activity (Last 7 Days)</h3>
          <div class="chart-legend"><span class="dot"></span> Bytes uploaded</div>
        </div>
        <!-- Fixed Pure CSS Histogram Chart -->
        <div class="bar-chart flex items-end justify-between border-b border-gray-100 gap-2 h-[260px] pb-2 px-2 mt-4">
           <div class="chart-col flex flex-col items-center justify-end flex-1 h-full group" *ngFor="let d of analytics?.data?.storageActivity || defaultActivity">
             <div class="w-full bg-indigo-500 rounded-t-lg transition-all duration-700 hover:bg-indigo-400 cursor-pointer relative" 
                  [style.height.%]="d.percentage || 1">
               <!-- Tooltip -->
               <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                 {{ formatBytes(d.bytes) }}
               </div>
             </div>
             <span class="text-[10px] font-bold text-gray-400 mt-3 uppercase tracking-tighter">{{ d.day }}</span>
           </div>
           
           <div class="w-full text-center py-6 text-gray-400 text-sm absolute h-full flex items-center justify-center top-0" *ngIf="!analytics?.data?.storageActivity?.length">
              No recent upload activity logged.
           </div>
        </div>
      </div>

      <div class="card recent-activity-list flex flex-col overflow-hidden max-h-[350px]">
        <h3>Recent Activity</h3>
        <ul class="activity-log overflow-y-auto pr-2 pb-2 flex-1">
          <li *ngFor="let log of auditLogs; let i = index">
             <div class="activity-status" [ngClass]="{'bg-emerald-500': log.status === 'Success', 'bg-red-500': log.status !== 'Success'}"></div>
             <div class="activity-text truncate flex-1">
                <strong>{{ log.event }}</strong>
                <span class="truncate block w-full">{{ log.user || 'System' }} • {{ log.timestamp | date:'shortTime' }}</span>
             </div>
          </li>
          <li *ngIf="!auditLogs?.length" class="text-gray-400 text-sm py-4">
             No recent activity logs.
          </li>
        </ul>
      </div>
    </div>

    <div class="dashboard-bottom" *ngIf="!loading">
       <div class="card type-card">
         <div class="icon-box text-blue"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></div>
         <h4>DOCUMENTS</h4>
         <p class="big">{{ stats?.data?.typeDistribution?.documents?.count || 0 }}</p>
         <span class="sub">{{ formatBytes(stats?.data?.typeDistribution?.documents?.bytes || 0) }}</span>
       </div>
       <div class="card type-card">
         <div class="icon-box text-purple"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
         <h4>IMAGES</h4>
         <p class="big">{{ stats?.data?.typeDistribution?.image?.count || 0 }}</p>
         <span class="sub">{{ formatBytes(stats?.data?.typeDistribution?.image?.bytes || 0) }}</span>
       </div>
       <div class="card type-card">
         <div class="icon-box text-pink"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
         <h4>VIDEOS</h4>
         <p class="big">{{ stats?.data?.typeDistribution?.video?.count || 0 }}</p>
         <span class="sub">{{ formatBytes(stats?.data?.typeDistribution?.video?.bytes || 0) }}</span>
       </div>
       <div class="card type-card">
         <div class="icon-box text-orange"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
         <h4>AUDIO</h4>
         <p class="big">{{ stats?.data?.typeDistribution?.audio?.count || 0 }}</p>
         <span class="sub">{{ formatBytes(stats?.data?.typeDistribution?.audio?.bytes || 0) }}</span>
       </div>
       <div class="card type-card">
         <div class="icon-box text-gray"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></div>
         <h4>OTHER</h4>
         <p class="big">{{ stats?.data?.typeDistribution?.other?.count || 0 }}</p>
         <span class="sub">{{ formatBytes(stats?.data?.typeDistribution?.other?.bytes || 0) }}</span>
       </div>
    </div>

    <ng-template #spinner>
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; padding-right:8px; }
    .dashboard-header { display: flex; flex-direction: column; position: relative; margin-bottom: 2rem; }
    .dashboard-header h2 { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
    .dashboard-header p { font-size: 13px; color: #64748b; margin: 0; }
    .refresh-btn { position: absolute; right: 0; top: 0; background: #fff; border: 1px solid #e2e8f0; width: 44px; height: 36px; border-radius: 6px; color: #6E56EB; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .refresh-btn:hover { background: #f8fafc; }
    .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .stats-grid { display: grid; gap: 1.5rem; }
    .top-tiles { grid-template-columns: repeat(1, 1fr); margin-bottom: 2rem; }
    @media (min-width: 768px) { .top-tiles { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1024px) { .top-tiles { grid-template-columns: repeat(4, 1fr); } }
    
    .card { background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #f1f5f9; }
    .stat { display: flex; gap: 1.25rem; align-items: center; }
    
    .stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon-svg { width: 22px; height: 22px; stroke-width: 2px; }
    
    .users-icon-bg { background: #eff6ff; color: #3b82f6; }
    .storage-icon-bg { background: #faf5ff; color: #a855f7; }
    .files-icon-bg { background: #fffbeb; color: #f59e0b; }
    .active-icon-bg { background: #f0fdf4; color: #22c55e; }

    .stat-info { flex: 1; }
    .stat-info h3 { font-size: 12px; font-weight: 600; color: #64748b; margin: 0 0 0.5rem; font-family: inherit; }
    .number { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: -0.5px; }
    .subtext { font-size: 11px; font-weight: 600; }
    .text-green { color: #10b981; }
    .text-yellow { color: #d97706; }
    
    .progress.tiny { height: 4px; background: #f1f5f9; border-radius: 2px; width: 80px; margin-top: 8px; }
    .progress-bar { height: 100%; background: #6E56EB; border-radius: 2px; }

    .dashboard-footer { margin-top: 2rem; }
    .dashboard-middle { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    @media (min-width: 1024px) { .dashboard-middle { grid-template-columns: 2fr 1fr; } }
    
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .card-header h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0; }
    .chart-legend { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; background: #6366f1; border-radius: 50%; }
    
    .bar-chart { min-height: 260px; position: relative; }
    .chart-col .w-full { min-width: 12px; max-width: 32px; }

    .recent-activity-list h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 1.5rem; }
    .activity-log { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1.2rem; }
    .activity-log li { display: flex; align-items: flex-start; gap: 12px; }
    .activity-status { width: 3px; height: 24px; border-radius: 2px; flex-shrink:0; }
    .activity-text { display: flex; flex-direction: column; }
    .activity-text strong { font-size: 12px; color: #334155; }
    .activity-text span { font-size: 11px; color: #64748b; }

    .dashboard-bottom { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; padding-bottom: 2rem; }
    @media (min-width: 768px) { .dashboard-bottom { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1024px) { .dashboard-bottom { grid-template-columns: repeat(5, 1fr); } }
    
    .type-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.5rem 1rem; }
    .icon-box { background: #f8fafc; padding: 10px; border-radius: 10px; margin-bottom: 12px; display: inline-flex; }
    .text-blue { color: #3b82f6; background: #eff6ff; }
    .text-purple { color: #a855f7; background: #faf5ff; }
    .text-pink { color: #ec4899; background: #fdf2f8; }
    .text-orange { color: #f97316; background: #fff7ed; }
    .text-gray { color: #64748b; background: #f1f5f9; }
    .type-card h4 { font-size: 10px; font-weight: 700; color: #64748b; margin: 0 0 8px; letter-spacing: 0.5px; }
    .type-card .big { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0 0 4px; }
    .type-card .sub { font-size: 11px; color: #94a3b8; }

    .spinner-container { display: flex; justify-content: center; padding: 4rem; }
    .spinner { border: 4px solid rgba(0,0,0,0.1); border-left-color: #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  stats: any = null;
  analytics: any = null;
  auditLogs: any[] = [];
  loading = true;
  refreshing = false;
  private refreshInterval: any;

  defaultActivity = [
    { day: 'Sun', bytes: 0, percentage: 1 },
    { day: 'Mon', bytes: 0, percentage: 1 },
    { day: 'Tue', bytes: 0, percentage: 1 },
    { day: 'Wed', bytes: 0, percentage: 1 },
    { day: 'Thu', bytes: 0, percentage: 1 },
    { day: 'Fri', bytes: 0, percentage: 1 },
    { day: 'Sat', bytes: 0, percentage: 1 }
  ];

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    // No interval to clear
  }

  async loadData() {
    if (this.loading) this.refreshing = true;

    try {
      const response = await this.adminService.getUnifiedDashboardData();

      if (response.success && response.data) {
        const unified = response.data;

        // 1. Stats and Storage Percentage
        this.stats = {
          success: true,
          data: {
            ...unified.stats,
            storagePercentage: Math.min((unified.stats.totalStorageBytes / (10 * 1024 * 1024 * 1024)) * 100, 100).toFixed(2),
            totalDocuments: unified.stats.totalFiles,
            typeDistribution: unified.typeDistribution
          }
        };

        // 2. Storage Activity Chart
        const peakVal = Math.max(...(unified.storageActivity || []).map((v: any) => parseFloat(v.value)), 0.1);
        this.analytics = {
          data: {
            storageActivity: (unified.storageActivity || []).map((d: any) => ({
              day: d.label,
              bytes: parseFloat(d.value) * 1024 * 1024,
              percentage: Math.max((parseFloat(d.value) / peakVal) * 100, 1)
            }))
          }
        };

        // 3. Audit Logs
        this.auditLogs = unified.recentActivity || [];
      }
    } catch (err) {
      console.error('Failed to load unified dashboard data', err);
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
