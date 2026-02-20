/**
 * Dashboard Component - CloudAI Smart Storage
 * =============================================
 * Main dashboard showing My Files with empty state and quick actions.
 * Premium light theme matching CloudAI design.
 * 
 * @author CloudAI Team
 */

import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { DocumentService } from '../core/services/document.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="animate-in">
      <!-- Page Header -->
      <div class="page-header">
        <h1 class="page-title">My Files</h1>
        <div class="flex items-center gap-3">
          <!-- View Toggle -->
          <div class="view-toggle">
            <button 
              (click)="viewMode.set('grid')"
              class="view-toggle-btn"
              [class.active]="viewMode() === 'grid'">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              (click)="viewMode.set('list')"
              class="view-toggle-btn"
              [class.active]="viewMode() === 'list'">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <button class="view-toggle-btn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"/>
              </svg>
            </button>
            <button class="view-toggle-btn">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
          
          <!-- Upload Button -->
          <button routerLink="/documents" class="btn-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Upload
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="isLoading()" class="card p-16">
        <div class="empty-state">
          <div class="spinner w-8 h-8 mb-4"></div>
          <p style="color: var(--text-muted);">Loading your files...</p>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!isLoading() && documentCount() === 0" class="card p-16">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <h3 class="empty-state-title">No files yet</h3>
          <p class="empty-state-description">
            Upload your <a routerLink="/documents" class="link">first file</a> to get started with Smart Cloud Storage
          </p>
          <button routerLink="/documents" class="btn-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Upload Files
          </button>
        </div>
      </div>

      <!-- Files Grid -->
      <div *ngIf="!isLoading() && documentCount() > 0">
        <!-- Grid View -->
        <div *ngIf="viewMode() === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div *ngFor="let doc of recentDocuments()" class="document-grid-card">
            <!-- File Type Badge -->
            <span [class]="getTypeBadgeClass(doc.fileType)" class="absolute top-3 left-3 z-10">
              {{ getFileExtension(doc.fileType) }}
            </span>

            <!-- Preview Area - Thumbnail or Icon -->
            <div class="document-preview">
              <!-- Show thumbnail if available -->
              <img 
                *ngIf="doc.thumbnailUrl" 
                [src]="getThumbnailUrl(doc)" 
                [alt]="doc.fileName"
                class="document-thumbnail"
                (error)="onThumbnailError($event, doc)"/>
              
              <!-- Fallback to icon if no thumbnail -->
              <svg *ngIf="!doc.thumbnailUrl" [class]="'document-preview-icon ' + getFileClass(doc.fileType)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>

            <!-- Document Info -->
            <h3 class="document-name" [title]="doc.fileName">{{ doc.fileName }}</h3>
            <div class="document-meta">
              <span>{{ formatFileSize(doc.fileSize) }}</span>
              <span [class]="getStatusClass(doc.status)">
                <span *ngIf="doc.status === 'ready'" class="flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: var(--success);"></span>
                  Ready
                </span>
                <span *ngIf="doc.status === 'processing'" class="flex items-center gap-1">
                  <span class="spinner w-3 h-3"></span>
                  Processing
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode() === 'list'" class="card divide-y" style="--tw-divide-opacity: 0.1;">
          <div *ngFor="let doc of recentDocuments()" 
               class="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50">
            <!-- File Icon -->
            <div class="recent-doc-icon" [ngClass]="getIconBgClass(doc.fileType)">
              <svg class="w-5 h-5" [ngClass]="getIconColorClass(doc.fileType)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>

            <!-- File Info -->
            <div class="flex-1 min-w-0">
              <h3 class="font-medium truncate" style="color: var(--text-primary);">{{ doc.fileName }}</h3>
              <p class="text-sm" style="color: var(--text-muted);">
                {{ formatFileSize(doc.fileSize) }} • {{ formatDate(doc.uploadedAt) }}
              </p>
            </div>

            <!-- Status -->
            <span [class]="getStatusBadgeClass(doc.status)">
              {{ doc.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  isLoading = signal(true);
  documentCount = signal(0);
  totalStorage = signal('0 KB');
  storagePercent = signal(0);
  recentDocuments = signal<any[]>([]);
  weeklyChange = signal(0);
  viewMode = signal<'grid' | 'list'>('grid');

  constructor(
    public authService: AuthService,
    private documentService: DocumentService
  ) {
    // CRITICAL FIX: Auto-sync dashboard when documentService.documents changes
    effect(() => {
      const docs = this.documentService.documents();
      console.log('[Dashboard] Documents signal changed, count:', docs.length);
      // Update dashboard stats
      this.documentCount.set(docs.length);
      this.recentDocuments.set(docs.slice(0, 20));

      // Calculate total storage
      const totalBytes = docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
      this.totalStorage.set(this.formatFileSize(totalBytes));
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      await this.documentService.loadDocuments();
      const docs = this.documentService.documents();

      this.documentCount.set(docs.length);
      this.recentDocuments.set(docs.slice(0, 20));

      // Calculate total storage
      const totalBytes = docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
      this.totalStorage.set(this.formatFileSize(totalBytes));

      // Calculate storage percentage (5 GB = 5368709120 bytes)
      const totalGB = 5 * 1024 * 1024 * 1024;
      this.storagePercent.set(Math.round((totalBytes / totalGB) * 100));

      // Calculate weekly change (documents added in last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentDocs = docs.filter(doc => new Date(doc.uploadedAt) > oneWeekAgo);
      this.weeklyChange.set(recentDocs.length);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getTypeBadgeClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'badge-pdf';
    if (type.includes('doc') || type.includes('word')) return 'badge-docx';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'badge-xlsx';
    if (type.includes('ppt') || type.includes('presentation')) return 'badge-pptx';
    return 'badge-txt';
  }

  getFileExtension(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('doc') || type.includes('word')) return 'DOCX';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'XLSX';
    if (type.includes('ppt') || type.includes('presentation')) return 'PPTX';
    return 'TXT';
  }

  getFileClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('doc') || type.includes('word')) return 'docx';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'xlsx';
    if (type.includes('ppt') || type.includes('presentation')) return 'pptx';
    return 'txt';
  }

  getIconBgClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'bg-red-50';
    if (type.includes('doc') || type.includes('word')) return 'bg-blue-50';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'bg-emerald-50';
    if (type.includes('ppt') || type.includes('presentation')) return 'bg-orange-50';
    return 'bg-gray-50';
  }

  getIconColorClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'text-red-500';
    if (type.includes('doc') || type.includes('word')) return 'text-blue-500';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'text-emerald-500';
    if (type.includes('ppt') || type.includes('presentation')) return 'text-orange-500';
    return 'text-gray-500';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ready':
        return 'text-emerald-600';
      case 'processing':
        return 'text-amber-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ready':
        return 'badge-success';
      case 'processing':
        return 'badge-warning';
      case 'failed':
        return 'badge-danger';
      default:
        return 'badge-primary';
    }
  }

  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Thumbnail helpers for Google Drive-style previews
  getThumbnailUrl(doc: any): string {
    // Priority: previewUrl (S3) > thumbnailUrl (legacy local)
    const url = doc.previewUrl || doc.thumbnailUrl;

    if (url) {
      // If it's a relative URL, prepend the API base
      if (url.startsWith('/')) {
        return `${environment.apiUrl}${url}`;
      }
      return url;
    }
    return '';
  }

  onThumbnailError(event: any, doc: any) {
    // On error, hide the broken image and show the icon fallback
    event.target.style.display = 'none';
    doc.previewUrl = null;
    doc.thumbnailUrl = null;  // This will trigger the fallback icon
  }
}
