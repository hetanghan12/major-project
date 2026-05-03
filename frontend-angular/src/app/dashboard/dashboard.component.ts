/**
 * Dashboard Component - CloudAI Smart Storage
 * =============================================
 * Main dashboard showing account overview, storage usage, and quick stats.
 * Matches requested premium dashboard UI.
 */

import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { DocumentService } from '../core/services/document.service';
import { DashboardService } from '../core/services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="animate-in bg-[var(--bg-main)] min-h-[calc(100vh-64px)] pb-12 transition-colors duration-200">
      <!-- Welcome Banner -->
      <div class="px-8 mt-6">
        <div class="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] rounded-[20px] p-8 text-white flex justify-between items-center shadow-md border border-white/10">
          <div>
            <h1 class="text-3xl font-bold mb-2 tracking-tight">Welcome back, {{ getFirstName() }}! 👋</h1>
            <p class="text-indigo-100/90 text-[15px]">Your cloud is looking healthy. You've used {{ storagePercent() }}% of your storage.</p>
          </div>
          <button *ngIf="authService.currentUser()?.plan !== 'pro'" 
                  class="bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-xl text-white font-medium transition-all text-sm border border-white/25 shadow-sm">
            Upgrade Plan
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 px-8 mt-6">
        <!-- My Files -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-6 shadow-sm border border-[var(--border-color)] flex items-center gap-5 hover:shadow-md transition-all">
          <div class="bg-indigo-50/50 dark:bg-indigo-900/20 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <span class="text-2xl">📄</span>
          </div>
          <div class="min-w-0">
            <p class="text-[13px] text-[var(--text-muted)] font-semibold mb-0.5 uppercase tracking-wide">My Files</p>
            <p class="text-2xl font-bold text-[var(--text-primary)]">{{ documentCount() | number }}</p>
          </div>
        </div>
        
        <!-- Starred -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-6 shadow-sm border border-[var(--border-color)] flex items-center gap-5 hover:shadow-md transition-all">
          <div class="bg-amber-50/50 dark:bg-amber-900/20 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <span class="text-2xl">🌟</span>
          </div>
          <div class="min-w-0">
            <p class="text-[13px] text-[var(--text-muted)] font-semibold mb-0.5 uppercase tracking-wide">Starred</p>
            <p class="text-2xl font-bold text-[var(--text-primary)]">{{ starredCount() | number }}</p>
          </div>
        </div>
 
        <!-- Shared -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-6 shadow-sm border border-[var(--border-color)] flex items-center gap-5 hover:shadow-md transition-all">
          <div class="bg-orange-50/50 dark:bg-orange-900/20 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <span class="text-2xl">🤝</span>
          </div>
          <div class="min-w-0">
            <p class="text-[13px] text-[var(--text-muted)] font-semibold mb-0.5 uppercase tracking-wide">Shared</p>
            <p class="text-2xl font-bold text-[var(--text-primary)]">{{ sharedCount() | number }}</p>
          </div>
        </div>
 
        <!-- AI Tasks -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-6 shadow-sm border border-[var(--border-color)] flex items-center gap-5 hover:shadow-md transition-all">
          <div class="bg-pink-50/50 dark:bg-pink-900/20 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
            <span class="text-2xl">🤖</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <p class="text-[13px] text-[var(--text-muted)] font-semibold mb-0.5 uppercase tracking-wide">AI Tasks</p>
              <span class="text-[9px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Plan Limit</span>
            </div>
            <p class="text-2xl font-bold text-[var(--text-primary)] mb-1">{{ aiTasksCount() }}</p>
            <p class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              {{ aiTasksRemaining() }} queries left this month
            </p>
          </div>
        </div>
      </div>

      <!-- Detailed Analytics Row -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 px-8 mt-6">
        
        <!-- Storage Usage Details -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-7 shadow-sm border border-[var(--border-color)] h-full flex flex-col">
          <h3 class="font-semibold text-[var(--text-primary)] mb-8 text-[17px]">Storage Usage</h3>
          
          <div class="flex items-center justify-between flex-1 px-4 lg:px-8">
            <!-- Donut Chart -->
            <div class="relative w-56 h-56 shrink-0">
               <!-- SVG Donut Chart -->
               <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                  <!-- Background Circle (Free Space) -->
                  <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--bg-elevated)" stroke-width="4.5"></circle>
                  
                  <!-- Segments (stroke-dasharray="percentage 100") -->
                  <!-- Documents -->
                  <circle *ngIf="docsPercent() > 0" cx="18" cy="18" r="15.915" fill="transparent" stroke="#8b5cf6" stroke-width="5" 
                          [attr.stroke-dasharray]="docsPercent() + ' 100'" 
                          stroke-dashoffset="0" class="transition-all duration-1000"></circle>
                          
                  <!-- Media -->
                  <circle *ngIf="mediaPercent() > 0" cx="18" cy="18" r="15.915" fill="transparent" stroke="#a855f7" stroke-width="5" 
                          [attr.stroke-dasharray]="mediaPercent() + ' 100'" 
                          [attr.stroke-dashoffset]="'-' + docsPercent()" class="transition-all duration-1000"></circle>
                          
                  <!-- Others -->
                  <circle *ngIf="othersPercent() > 0" cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" stroke-width="5" 
                          [attr.stroke-dasharray]="othersPercent() + ' 100'" 
                          [attr.stroke-dashoffset]="'-' + (docsPercent() + mediaPercent())" class="transition-all duration-1000"></circle>
               </svg>
               <!-- Center Label -->
               <div class="absolute inset-0 flex items-center justify-center flex-col">
                 <span class="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{{ storagePercent() }}%</span>
                 <span class="text-sm text-[var(--text-muted)] font-medium">Used</span>
               </div>
            </div>
            
            <!-- Legend List -->
            <div class="flex flex-col gap-4 ml-8">
              <div class="flex items-center gap-3">
                 <span class="w-4 h-4 rounded-[4px] bg-[#8b5cf6]"></span>
                 <span class="text-[14px] text-[var(--text-muted)] font-medium w-24">Documents</span>
                 <span class="text-[14px] font-bold text-[var(--text-primary)]">{{ formatFileSize(docsStorage()) }}</span>
              </div>
              <div class="flex items-center gap-3">
                 <span class="w-4 h-4 rounded-[4px] bg-[#a855f7]"></span>
                 <span class="text-[14px] text-[var(--text-muted)] font-medium w-24">Media</span>
                 <span class="text-[14px] font-bold text-[var(--text-primary)]">{{ formatFileSize(mediaStorage()) }}</span>
              </div>
              <div class="flex items-center gap-3">
                 <span class="w-4 h-4 rounded-[4px] bg-[#10b981]"></span>
                 <span class="text-[14px] text-[var(--text-muted)] font-medium w-24">Others</span>
                 <span class="text-[14px] font-bold text-[var(--text-primary)]">{{ formatFileSize(othersStorage()) }}</span>
              </div>
              <div class="flex items-center gap-3 mt-3 pt-4 border-t border-[var(--border-color)]">
                 <span class="w-4 h-4 rounded-[4px] bg-[var(--text-muted)]"></span>
                 <span class="text-[14px] text-[var(--text-muted)] font-medium w-24">Free</span>
                 <span class="text-[14px] font-bold text-[var(--text-primary)]">{{ formatFileSize(freeStorage()) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity List -->
        <div class="bg-[var(--bg-card)] rounded-[20px] p-7 shadow-sm border border-[var(--border-color)] h-full flex flex-col">
          <h3 class="font-semibold text-[var(--text-primary)] mb-5 text-[17px]">Recent Activity</h3>
          
          <div class="flex-1 flex flex-col gap-3">
             <div *ngFor="let doc of recentDocuments()" 
                  class="flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors border border-transparent hover:border-[var(--border-color)] cursor-pointer"
                  routerLink="/documents">
                
                <!-- File Icon with Custom Background -->
                <div class="w-11 h-11 flex items-center justify-center rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-sm shrink-0" 
                     [ngClass]="getIconBgClass(doc.fileType)">
                   <span class="text-xl">{{ getFileEmoji(doc.fileType) }}</span>
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0 pr-4">
                   <h4 class="text-[14px] font-bold text-[var(--text-primary)] truncate mb-0.5" [title]="doc.fileName">{{ doc.fileName }}</h4>
                   <p class="text-[12px] text-[var(--text-muted)] font-medium">{{ formatDate(doc.uploadedAt) }}</p>
                </div>
                
                <!-- Size -->
                <div class="text-[14px] font-bold text-[var(--text-secondary)] shrink-0">
                  {{ formatFileSize(doc.fileSize) }}
                </div>
             </div>
             
             <!-- Empty State -->
             <div *ngIf="recentDocuments().length === 0 && !isLoading()" class="m-auto text-center text-[var(--text-muted)]">
                <p>No recent files</p>
             </div>

             <!-- Loading -->
             <div *ngIf="isLoading()" class="m-auto flex justify-center py-8">
               <div class="spinner w-8 h-8"></div>
             </div>
          </div>
        </div>
        
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  isLoading = signal(true);
  documentCount = signal(0);
  starredCount = signal(0);
  sharedCount = signal(0);
  aiTasksCount = signal(0);
  aiTasksLimit = signal(0);
  aiTasksRemaining = signal(0);

  // Storage data
  docsStorage = signal(0);
  mediaStorage = signal(0);
  othersStorage = signal(0);
  freeStorage = signal(0);
  totalStorage = signal('0 KB');

  // Chart percentages (0 to 100)
  docsPercent = signal(0);
  mediaPercent = signal(0);
  othersPercent = signal(0);
  storagePercent = signal(0);

  recentDocuments = signal<any[]>([]);

  constructor(
    public authService: AuthService,
    private documentService: DocumentService,
    private dashboardService: DashboardService
  ) {
    // Reactive sync: When the shared service updates its signal, update this component's local signals.
    effect(() => {
      const data = this.dashboardService.dashboardData();
      if (data && data.success) {
        this.updateLocalSignals(data);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Helper to sync backend data with component signals
   */
  private updateLocalSignals(data: any): void {
    const { stats, recentDocuments, typeDistribution } = data;

    // Card Stats
    this.documentCount.set(stats.totalFiles || 0);
    this.starredCount.set(stats.starredCount || 0);
    this.sharedCount.set(stats.sharedCount || 0);
    this.aiTasksCount.set(stats.aiTasksCount || 0);
    this.aiTasksLimit.set(stats.aiTasksLimit || 0);
    this.aiTasksRemaining.set(stats.aiTasksRemaining || 0);

    // Recent files (Strict safety slice of 5 to ensure UI consistency)
    this.recentDocuments.set((recentDocuments || []).slice(0, 5));

    // Storage Details
    this.docsStorage.set(typeDistribution?.documents?.bytes || 0);
    this.mediaStorage.set(typeDistribution?.media?.bytes || 0);
    this.othersStorage.set(typeDistribution?.others?.bytes || 0);

    const totalUsed = stats.totalStorageUsed || 0;
    // Fallback to 5GB (Free limit) if backend hasn't provided it yet
    const limit = stats.storageLimit || (5 * 1024 * 1024 * 1024);
    this.totalStorage.set(this.formatFileSize(totalUsed));
    this.freeStorage.set(Math.max(0, limit - totalUsed));
    this.storagePercent.set(stats.percentUsed || 0);

    if (limit > 0) {
      this.docsPercent.set((this.docsStorage() / limit) * 100);
      this.mediaPercent.set((this.mediaStorage() / limit) * 100);
      this.othersPercent.set((this.othersStorage() / limit) * 100);
    }
  }

  async loadDashboardData(): Promise<void> {
    try {
      this.isLoading.set(true);

      if (this.authService.isAuthenticated()) {
        const response = await this.dashboardService.getDashboardAsync();
        if (response && response.success) {
          this.updateLocalSignals(response);
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getFirstName(): string {
    const fullName = this.authService.currentUser()?.displayName;
    if (fullName && fullName.includes(' ')) {
      return fullName.split(' ')[0];
    }
    return fullName || 'User';
  }

  getFileEmoji(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return '📄';
    if (type.includes('doc') || type.includes('word')) return '📝';
    if (type.includes('xls') || type.includes('spreadsheet')) return '📊';
    if (type.includes('ppt') || type.includes('presentation')) return '🖥️';
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return '🖼️';
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
    if (type.includes('video') || type.includes('mp4')) return '🎬';
    return '📁';
  }

  getIconBgClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'bg-red-50 text-red-500';
    if (type.includes('doc') || type.includes('word')) return 'bg-blue-50 text-blue-500';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'bg-emerald-50 text-emerald-500';
    if (type.includes('ppt') || type.includes('presentation')) return 'bg-orange-50 text-orange-500';
    if (type.includes('image') || type.includes('audio') || type.includes('video')) return 'bg-purple-50 text-purple-500';
    return 'bg-gray-50 text-gray-500';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 KB';
    return this.documentService.formatFileSize(bytes);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (hours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
