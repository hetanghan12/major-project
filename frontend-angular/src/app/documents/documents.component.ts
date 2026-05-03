/**
 * Documents Component - Google Drive Style
 * ==========================================
 * Enhanced with Google Drive-like features:
 * - Right-click context menu
 * - File preview modal
 * - Star/unstar files
 * - Create folders
 * - Breadcrumb navigation
 * - Multi-select support
 * 
 * @author CloudAI Team
 */

import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, effect, HostListener, inject, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DocumentService, Document } from '../core/services/document.service';
import { SettingsService } from '../core/services/settings.service';
import { ToastService } from '../core/services/toast.service';
import { SelectionService } from '../core/services/selection.service';
import { ShareService, SharedWithMeFile } from '../core/services/share.service';
import { AuthService } from '../core/services/auth.service';
import { PLANS } from '../core/config/plans.config';
import { ContextMenuComponent } from '../shared/context-menu/context-menu.component';
import { FilePreviewComponent } from '../shared/file-preview/file-preview.component';
import { NewButtonComponent } from '../shared/new-button/new-button.component';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb.component';
import { ShareModalComponent } from '../shared/share-modal/share-modal.component';
import { CloudFile, BreadcrumbItem } from '../core/models/file.model';


@Component({
  standalone: true,
  selector: 'app-documents',
  imports: [
    CommonModule,
    FormsModule,
    ContextMenuComponent,
    FilePreviewComponent,
    NewButtonComponent,
    BreadcrumbComponent,
    ShareModalComponent,
    TitleCasePipe, DatePipe, DecimalPipe
  ],
  template: `
    <div class="drive-container animate-in" 
         (contextmenu)="onBackgroundContextMenu($event)"
         (click)="clearSelection()">
      
      <!-- Error/Partial Success Banner -->
      <div class="error-banner animate-in" *ngIf="showErrorBanner()">
        <div class="error-banner-left">
          <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <div class="error-content">
            <span class="error-main">{{ errorMessage() }}</span>
            <span class="error-small" *ngIf="lastFailedAction()">Selected items have been kept for retry.</span>
          </div>
        </div>
        <div class="error-banner-actions">
          <button (click)="retryLastAction()" class="retry-btn">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
            Retry
          </button>
          <button (click)="dismissError()" class="dismiss-btn">Dismiss</button>
        </div>
      </div>

      <!-- Bulk Action Toolbar -->
      <div class="bulk-toolbar" *ngIf="selectedCount() > 0" (click)="$event.stopPropagation()">
        <div class="bulk-toolbar-left">
          <button (click)="clearSelection()" class="bulk-close-btn" title="Clear selection">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <span class="bulk-count">{{ selectedCount() }} item(s) selected</span>
        </div>
        
        <div class="bulk-toolbar-actions">
          <button (click)="bulkMove()" class="bulk-action-btn" [disabled]="isBulkProcessing()" title="Move selected items">
            <svg *ngIf="!actionLoading().move" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
            <div *ngIf="actionLoading().move" class="loader-xs"></div>
            <span>Move</span>
          </button>

          <button (click)="bulkCopy()" class="bulk-action-btn" [disabled]="isBulkProcessing()" title="Copy selected items">
            <svg *ngIf="!actionLoading().copy" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>
            </svg>
            <div *ngIf="actionLoading().copy" class="loader-xs"></div>
            <span>Copy</span>
          </button>

          <button (click)="bulkDelete()" class="bulk-action-btn danger" [disabled]="isBulkProcessing()" title="Delete selected items">
            <svg *ngIf="!actionLoading().delete" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <div *ngIf="actionLoading().delete" class="loader-xs"></div>
            <span>Delete</span>
          </button>
        </div>

        <div class="bulk-toolbar-right" *ngIf="isBulkProcessing()">
          <div class="loader-sm"></div>
        </div>
      </div>
      
      <!-- Top Bar with New Button and Breadcrumbs -->
      <div class="drive-top-bar">
        <div class="drive-top-left">
          <ng-container *ngIf="!currentFilter()">
            <!-- New Button (Google Drive style) -->
            <app-new-button
              (createFolder)="showCreateFolderDialog()"
              (uploadFiles)="onFilesSelected($event)">
            </app-new-button>

            <!-- Breadcrumb Navigation -->
            <app-breadcrumb 
              [items]="breadcrumbs()"
              (navigate)="navigateToFolder($event)">
            </app-breadcrumb>
          </ng-container>

          <ng-container *ngIf="currentFilter()">
             <div class="flex items-center gap-3 text-2xl font-semibold text-gray-800 ml-2">
               <!-- Icons for different filters -->
               <svg *ngIf="currentFilter() === 'starred'" class="w-7 h-7 text-yellow-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
               </svg>
               <svg *ngIf="currentFilter() === 'trash'" class="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
               </svg>
               <svg *ngIf="currentFilter() === 'recent'" class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span class="text-[var(--text-primary)] transition-colors">{{ formatFilterTitle(currentFilter()) }}</span>
             </div>
          </ng-container>
        </div>

        <div class="drive-top-right">
          <!-- Sort Dropdown -->
          <div class="sort-dropdown">
            <select [(ngModel)]="sortBy" (change)="filterDocuments()" class="sort-select">
              <option value="recent">Recent</option>
              <option value="oldest">Oldest</option>
              <option value="nameAsc">A-Z</option>
              <option value="nameDesc">Z-A</option>
              <option value="sizeDesc">Largest First</option>
              <option value="sizeAsc">Smallest First</option>
            </select>
          </div>

          <!-- View Toggle -->
          <div class="view-toggle">
            <button 
              (click)="viewMode.set('grid')"
              class="view-toggle-btn"
              [class.active]="viewMode() === 'grid'"
              title="Grid view">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button 
              (click)="viewMode.set('list')"
              class="view-toggle-btn"
              [class.active]="viewMode() === 'list'"
              title="List view">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <!-- Details toggle -->
          <button class="btn-ghost p-2" title="Show details" (click)="toggleDetails()">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        class="hidden"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.jpg,.jpeg,.png,.mp3,.wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/*,audio/*"
        multiple
        (change)="onFileSelect($event)"
      />

      <!-- Upload Progress -->
      <div *ngIf="documentService.uploadProgress()" class="upload-progress-card" [class.cancelled]="documentService.uploadProgress()?.status === 'cancelled'">
        <div class="upload-progress-header">
          <span class="font-medium truncate">{{ documentService.uploadProgress()?.fileName }}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted">{{ documentService.uploadProgress()?.progress }}%</span>
            <!-- Cancel Button (Only if uploading or processing) -->
            <button *ngIf="['uploading', 'processing'].includes(documentService.uploadProgress()?.status || '')" 
                    (click)="cancelUpload()" 
                    class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Cancel upload">
              Cancel
            </button>
            <!-- Clear Button (If complete or error) -->
            <button *ngIf="['complete', 'error'].includes(documentService.uploadProgress()?.status || '')" 
                    (click)="documentService.clearUploadProgress()" 
                    class="text-gray-400 hover:text-gray-600"
                    title="Close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" [style.width.%]="documentService.uploadProgress()?.progress" [class.bg-cancelled]="documentService.uploadProgress()?.status === 'cancelled'"></div>
        </div>
        <p class="upload-progress-status">
          <span *ngIf="documentService.uploadProgress()?.status === 'uploading'">Uploading...</span>
          <span *ngIf="documentService.uploadProgress()?.status === 'processing'" class="flex items-center gap-2">
            <span class="spinner w-3 h-3"></span>
            Processing & generating AI embeddings...
          </span>
          <span *ngIf="documentService.uploadProgress()?.status === 'complete'" class="text-success">
            ✓ Upload complete!
          </span>
          <span *ngIf="documentService.uploadProgress()?.status === 'cancelled'" class="text-warning">
            ⏹️ Cancelled
          </span>
          <span *ngIf="documentService.uploadProgress()?.status === 'error'" class="text-danger">
             {{ documentService.uploadProgress()?.error }}
          </span>
        </p>
      </div>

      <!-- Loading state -->
      <div *ngIf="documentService.isLoading()" class="file-grid">
        <div *ngFor="let i of [1,2,3,4,5,6,7,8]" class="file-card-skeleton">
          <div class="skeleton w-full aspect-[4/3] mb-3"></div>
          <div class="skeleton h-4 w-2/3 mb-2"></div>
          <div class="skeleton h-3 w-1/2"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!documentService.isLoading() && filteredDocuments().length === 0" class="empty-state-card">
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
          </div>
          <h3 class="empty-state-title">{{ getEmptyStateTitle() }}</h3>
          <p class="empty-state-description">{{ getEmptyStateDescription() }}</p>
          <button *ngIf="!currentFilter()" (click)="fileInput.click()" class="btn-primary mt-4">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Upload Files
          </button>
        </div>
      </div>

      <!-- File Count -->
      <div *ngIf="!documentService.isLoading() && filteredDocuments().length > 0" class="file-count">
        <span>{{ filteredDocuments().length }} {{ filteredDocuments().length === 1 ? 'item' : 'items' }}</span>
        <span *ngIf="selectedCount() > 0" class="selected-count">
          • {{ selectedCount() }} selected
        </span>
      </div>

      <!-- Grid View -->
      <div *ngIf="!documentService.isLoading() && filteredDocuments().length > 0 && viewMode() === 'grid'" 
           class="file-grid">
        <div *ngFor="let doc of filteredDocuments(); trackBy: trackByDoc" 
             class="file-card group"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
          <!-- Star Badge -->
          <button class="star-badge transition-all"
                  [class.opacity-0]="!doc.isStarred && !isSelected(doc)"
                  [class.group-hover:opacity-100]="!doc.isStarred"
                  [class.text-yellow-400]="doc.isStarred"
                  [class.text-gray-400]="!doc.isStarred && isSelected(doc)"
                  (click)="toggleStar(doc, $event)"
                  [title]="doc.isStarred ? 'Remove from starred' : 'Add to starred'">
            <svg class="w-4 h-4" [attr.fill]="doc.isStarred ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </button>

          <!-- Selection Checkbox -->
          <div class="selection-checkbox transition-all"
               [class.opacity-0]="!isSelected(doc)"
               [class.group-hover:opacity-100]="!isSelected(doc)">
            <input 
              type="checkbox"
              [checked]="isSelected(doc)"
              (change)="toggleSelection(doc, $event)"
              (click)="$event.stopPropagation()"
              class="custom-checkbox" />
          </div>

          <!-- File Type Badge -->
          <span *ngIf="!doc.isFolder" [class]="getTypeBadgeClass(doc.fileType)" class="file-type-badge">
            {{ getFileExtension(doc.fileType) }}
          </span>

          <!-- More Options -->
          <button class="more-options-btn" 
                  (click)="onMoreOptions($event, doc)"
                  title="More options">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>

          <!-- Preview Area -->
          <div class="file-preview relative overflow-hidden" [class]="doc.isFolder ? 'folder-preview-bg' : getFilePreviewClass(doc.fileType)">
            <!-- Folder Icon -->
            <svg *ngIf="doc.isFolder" class="file-preview-icon folder-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"/>
            </svg>

            <!-- 1. Reactive Skeleton/Processing Overlay -->
            <div *ngIf="!doc.isFolder && thumbnailMap()[doc.documentId]?.status === 'loading'" 
                 class="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 animate-in fade-in duration-300">
                <div class="flex flex-col items-center text-center p-2">
                    <div class="spinner w-6 h-6 mb-2 border-blue-500"></div>
                    <span class="text-xs text-gray-500 font-medium font-inter">Generating...</span>
                    <button class="mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded-full transition-all"
                            (click)="retryManualThumbnail(doc, $event)">
                        Refresh
                    </button>
                </div>
            </div>

            <!-- 2. Reactive Error / Fallback Overlay -->
            <div *ngIf="!doc.isFolder && thumbnailMap()[doc.documentId]?.status === 'error'" 
                 class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 border border-gray-100 rounded-md">
                <div class="flex flex-col items-center text-center p-3">
                  <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm border border-gray-200">
                     <span class="text-2xl">{{ getFileIcon(doc.fileType) }}</span>
                  </div>
                  <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">No Preview</span>
                  <button (click)="retryManualThumbnail(doc, $event)" 
                          class="text-[9px] text-blue-500 hover:underline font-bold flex items-center gap-1">
                     Retry
                  </button>
                </div>
            </div>

            <!-- 3. Base Placeholder (Hidden if map has a valid 'ready' state or is currently 'loading') -->
            <ng-container *ngIf="!doc.isFolder && (!thumbnailMap()[doc.documentId] || thumbnailMap()[doc.documentId].status === 'error')">
               <svg class="file-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                       d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
               </svg>
            </ng-container>

            <!-- Actual Thumbnail -->
            <img *ngIf="!doc.isFolder && thumbnailMap()[doc.documentId]?.status === 'ready'" 
                 [src]="thumbnailMap()[doc.documentId].url" 
                 loading="lazy"
                 class="w-full h-full object-cover rounded-md animate-in fade-in zoom-in-95 duration-500"
                 (error)="handleThumbnailError($event, doc)"
                 [alt]="doc.fileName" />
          </div>

          <!-- File Info -->
          <div class="file-info">
            <h3 class="file-name flex items-center gap-2" [title]="doc.fileName">
              <span class="truncate">{{ doc.fileName }}</span>
              <span *ngIf="doc.sharedWith && doc.sharedWith.length > 0" class="shared-badge-inline" title="Shared">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 8c0 1.42-.45 2.73-1.21 3.8l.06.06c2.2.46 3.95 2.01 4.54 4.14.73.08 1.41.34 2 .76V15c0-2.67-5.33-4-8-4a5.96 5.96 0 00-4 1.54C11.3 12.01 13.5 10.26 13.94 8a5 5 0 00-.94-5H12a5 5 0 013 5zm-3-5a3 3 0 100 6 3 3 0 000-6zm2 12c0-1.33-2.67-2-4-2s-4 .67-4 2v2h8v-2zm-4-3a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </span>
            </h3>
            <div class="file-meta">
            <span class="file-size">{{ doc.isFolder ? 'Folder' : formatFileSize(doc.fileSize) }}</span>
            <span class="file-date">{{ formatDate(doc.uploadedAt) }}</span>
          </div>
            <div *ngIf="!doc.isFolder" class="file-status">
              <span [class]="getStatusBadgeClass(doc.status)">
                {{ (doc.status === 'completed' || doc.status === 'ready') ? 'Ready' : (doc.status === 'uploading' ? 'Uploading' : (doc.status === 'failed' ? 'Failed' : (doc.status === 'cancelled' ? 'Cancelled' : 'Processing'))) }}
              </span>
            </div>
            <!-- AI Index indicator -->
            <div *ngIf="!doc.isFolder && doc.vectorCount" class="ai-indexed">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              {{ doc.vectorCount }} AI chunks
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div *ngIf="!documentService.isLoading() && filteredDocuments().length > 0 && viewMode() === 'list'" 
           class="file-list">
        <!-- List Header -->
        <div class="file-list-header">
          <div class="file-list-col checkbox-col">
            <input 
              type="checkbox"
              [checked]="isAllSelected()"
              [indeterminate]="isPartiallySelected()"
              (change)="toggleSelectAll($event)"
              class="custom-checkbox" />
          </div>
          <div class="file-list-col name">Name</div>
          <div class="file-list-col modified">Modified</div>
          <div class="file-list-col size">Size</div>
          <div class="file-list-col status">Status</div>
          <div class="file-list-col actions w-12"></div>
        </div>

        <!-- List Items -->
        <div *ngFor="let doc of filteredDocuments(); trackBy: trackByDoc" 
             class="file-list-item group"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
          <div class="file-list-col checkbox-col">
            <input 
              type="checkbox"
              [checked]="isSelected(doc)"
              (change)="toggleSelection(doc, $event)"
              (click)="$event.stopPropagation()"
              class="custom-checkbox" />
          </div>
          
          <div class="file-list-col name">
            <div class="file-list-icon" [class]="doc.isFolder ? 'bg-blue-50' : getIconBgClass(doc.fileType)">
              <!-- Folder icon -->
              <svg *ngIf="doc.isFolder" class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"/>
              </svg>
              <!-- File icon -->
              <svg *ngIf="!doc.isFolder" class="w-5 h-5" [class]="getIconColorClass(doc.fileType)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span class="file-list-name" [title]="doc.fileName">{{ doc.fileName }}</span>
            <span *ngIf="doc.sharedWith && doc.sharedWith.length > 0" class="shared-badge-inline" title="Shared">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 8c0 1.42-.45 2.73-1.21 3.8l.06.06c2.2.46 3.95 2.01 4.54 4.14.73.08 1.41.34 2 .76V15c0-2.67-5.33-4-8-4a5.96 5.96 0 00-4 1.54C11.3 12.01 13.5 10.26 13.94 8a5 5 0 00-.94-5H12a5 5 0 013 5zm-3-5a3 3 0 100 6 3 3 0 000-6zm2 12c0-1.33-2.67-2-4-2s-4 .67-4 2v2h8v-2zm-4-3a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
            </span>
            <span *ngIf="doc.sharedWith && doc.sharedWith.length > 0" class="shared-badge-inline" title="Shared">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 8c0 1.42-.45 2.73-1.21 3.8l.06.06c2.2.46 3.95 2.01 4.54 4.14.73.08 1.41.34 2 .76V15c0-2.67-5.33-4-8-4a5.96 5.96 0 00-4 1.54C11.3 12.01 13.5 10.26 13.94 8a5 5 0 00-.94-5H12a5 5 0 013 5zm-3-5a3 3 0 100 6 3 3 0 000-6zm2 12c0-1.33-2.67-2-4-2s-4 .67-4 2v2h8v-2zm-4-3a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
            </span>
            <button class="star-indicator hover:scale-110 transition-all opacity-0 group-hover:opacity-100" 
                    [class.!opacity-100]="doc.isStarred"
                    [class.text-yellow-500]="doc.isStarred"
                    [class.text-gray-400]="!doc.isStarred"
                    (click)="toggleStar(doc, $event)" 
                    [title]="doc.isStarred ? 'Unstar' : 'Add to starred'">
              <svg class="w-4 h-4" [attr.fill]="doc.isStarred ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </button>
          </div>
          
          <div class="file-list-col modified">{{ formatDate(doc.uploadedAt) }}</div>
          <div class="file-list-col size">{{ doc.isFolder ? '--' : formatFileSize(doc.fileSize) }}</div>
          <div class="file-list-col status">
            <span [class]="getStatusBadgeClass(doc.status)">
              {{ (doc.status === 'completed' || doc.status === 'ready') ? 'Ready' : (doc.status === 'uploading' ? 'Uploading' : (doc.status === 'failed' ? 'Failed' : (doc.status === 'cancelled' ? 'Cancelled' : 'Processing'))) }}
            </span>
          </div>
          
          <div class="file-list-col actions" style="display: flex; justify-content: flex-end;">
            <button class="more-options-btn opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-100" 
                    style="padding: 6px; border-radius: 50%; color: #6b7280;"
                    (click)="onMoreOptions($event, doc)"
                    title="More options">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Context Menu -->
      <app-context-menu
        *ngIf="showContextMenu()"
        [x]="contextMenuX"
        [y]="contextMenuY"
        [file]="contextMenuFile"
        [currentFilter]="currentFilter()"
        (action)="onContextMenuAction($event)"
        (close)="closeContextMenu()">
      </app-context-menu>

      <!-- File Preview Modal -->
      <app-file-preview
        *ngIf="previewFile()"
        [file]="previewFile()"
        (close)="closePreview()"
        (download)="downloadDocument($event)"
        (star)="toggleStarFromPreview($event)">
      </app-file-preview>

      <!-- Create Folder Modal -->
      <div *ngIf="showFolderModal()" class="modal-overlay" (click)="closeFolderModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">New folder</h3>
          <input 
            #folderNameInput
            type="text" 
            class="input-field" 
            placeholder="Untitled folder"
            [(ngModel)]="newFolderName"
            (keyup.enter)="createFolder()"
            autofocus/>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeFolderModal()">Cancel</button>
            <button class="btn-primary" (click)="createFolder()" [disabled]="!newFolderName.trim()">Create</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteModal()" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal-content danger" (click)="$event.stopPropagation()">
          <div class="modal-icon danger">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h3 class="modal-title">{{ currentFilter() === 'trash' ? 'Delete permanently?' : 'Move to trash?' }}</h3>
          <p class="modal-description">
            "{{ documentToDelete()?.fileName }}" will be {{ currentFilter() === 'trash' ? 'permanently deleted. This cannot be undone.' : 'moved to trash.' }}
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
            <button class="btn-danger" (click)="confirmDelete()" [disabled]="isDeleting()">
              <span *ngIf="!isDeleting()">{{ currentFilter() === 'trash' ? 'Delete permanently' : 'Move to trash' }}</span>
              <span *ngIf="isDeleting()" class="flex items-center gap-2">
                <div class="spinner w-4 h-4"></div>
                Deleting...
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Dropzone Overlay -->
      <div *ngIf="isDragOver()" class="dropzone-overlay">
        <div class="dropzone-content">
          <div class="dropzone-icon">
            <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <p class="dropzone-text">Drop files here to upload</p>
          <p class="dropzone-subtext">PDF, DOCX, TXT, PPT, Images, Audio</p>
        </div>
      </div>

      <!-- Rename Modal -->
      <div *ngIf="showRenameModal()" class="modal-overlay" (click)="closeRenameModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Rename file</h3>
          <input 
            type="text" 
            class="input-field" 
            [(ngModel)]="renameInputValue"
            (keyup.enter)="confirmRename()"
            autofocus/>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeRenameModal()">Cancel</button>
            <button class="btn-primary" (click)="confirmRename()" [disabled]="!renameInputValue.trim()">Rename</button>
          </div>
        </div>
      </div>

      <!-- Move Modal -->
      <div *ngIf="showMoveModal()" class="modal-overlay" (click)="closeMoveModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Move to...</h3>
          
          <div class="move-folders-list" style="max-height: 300px; overflow-y: auto; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div 
              class="move-folder-item" 
              style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;"
              [class.active]="selectedDestinationFolderId() === null"
              (click)="selectMoveDestination(null)"
              [style.background]="selectedDestinationFolderId() === null ? '#e0e7ff' : 'transparent'"
            >
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>My Drive (Root)</span>
            </div>
            
            <ng-container *ngIf="availableFolders().length > 0">
              <div 
                *ngFor="let folder of availableFolders(); trackBy: trackByDoc" 
                class="move-folder-item"
                style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; border-top: 1px solid #e5e7eb;"
                [class.active]="selectedDestinationFolderId() === folder.documentId"
                (click)="selectMoveDestination(folder.documentId)"
                [style.background]="selectedDestinationFolderId() === folder.documentId ? '#e0e7ff' : 'transparent'"
              >
                <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                <span>{{ folder.fileName }}</span>
              </div>
            </ng-container>
            
            <div *ngIf="availableFolders().length === 0" style="padding: 16px; text-align: center; color: #6b7280; border-top: 1px solid #e5e7eb; font-size: 14px;">
              No other folders available.
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeMoveModal()">Cancel</button>
            <button class="btn-primary" (click)="confirmMove()" [disabled]="isMoving()">
              <span *ngIf="!isMoving()">Move</span>
              <span *ngIf="isMoving()" class="flex items-center gap-2">
                <div class="spinner w-4 h-4" style="border-width: 2px;"></div>
                Moving...
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Copy Modal -->
      <div *ngIf="showCopyModal()" class="modal-overlay" (click)="closeCopyModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Copy to...</h3>
          
          <div class="move-folders-list" style="max-height: 300px; overflow-y: auto; margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div 
              class="move-folder-item" 
              style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;"
              [class.active]="selectedCopyDestinationFolderId() === null"
              (click)="selectCopyDestination(null)"
              [style.background]="selectedCopyDestinationFolderId() === null ? '#e0e7ff' : 'transparent'"
            >
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>My Drive (Root)</span>
            </div>
            
            <ng-container *ngIf="availableFoldersForCopy().length > 0">
              <div 
                *ngFor="let folder of availableFoldersForCopy(); trackBy: trackByDoc" 
                class="move-folder-item"
                style="padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s; border-top: 1px solid #e5e7eb;"
                [class.active]="selectedCopyDestinationFolderId() === folder.documentId"
                (click)="selectCopyDestination(folder.documentId)"
                [style.background]="selectedCopyDestinationFolderId() === folder.documentId ? '#e0e7ff' : 'transparent'"
              >
                <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                <span>{{ folder.fileName }}</span>
              </div>
            </ng-container>
            
            <div *ngIf="availableFoldersForCopy().length === 0" style="padding: 16px; text-align: center; color: #6b7280; border-top: 1px solid #e5e7eb; font-size: 14px;">
              No other folders available.
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" (click)="closeCopyModal()">Cancel</button>
            <button class="btn-primary" (click)="confirmCopy()" [disabled]="isCopying()">
              <span *ngIf="!isCopying()">Copy</span>
              <span *ngIf="isCopying()" class="flex items-center gap-2">
                <div class="spinner w-4 h-4" style="border-width: 2px;"></div>
                Copying...
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- File Details Modal -->
      <div *ngIf="showDetailsModal()" class="modal-overlay" (click)="closeDetailsModal()">
        <div class="modal-content" style="max-width: 400px" (click)="$event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 class="modal-title" style="margin: 0;">File Details</h3>
            <button (click)="closeDetailsModal()" style="border: none; background: transparent; cursor: pointer; color: #6b7280;">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div *ngIf="documentDetails()" style="display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; flex-direction: column;">
               <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Name</span>
               <span style="font-size: 14px; font-weight: 500; word-break: break-all; color: #1f2937; margin-top: 4px;">{{ documentDetails()?.fileName }}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between;">
              <div style="display: flex; flex-direction: column;">
                 <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Type</span>
                 <span style="font-size: 14px; color: #1f2937; font-weight: 500; margin-top: 4px;">{{ documentDetails()?.fileType || 'Unknown' }}</span>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end;">
                 <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Size</span>
                 <span style="font-size: 14px; color: #1f2937; font-weight: 500; margin-top: 4px;">{{ formatFileSize(documentDetails()?.fileSize || 0) }}</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column;">
               <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Uploaded</span>
              <span style="font-size: 14px; color: #1f2937; font-weight: 500; margin-top: 4px;">{{ formatDate(documentDetails()?.uploadedAt || '') }}</span>
            </div>

            <div style="display: flex; flex-direction: column;">
               <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Status</span>
               <span style="font-size: 14px; color: #1f2937; font-weight: 500; margin-top: 4px;">{{ documentDetails()?.status || 'Unknown' }}</span>
            </div>
          </div>
          
          <div class="modal-actions" style="margin-top: 24px;">
            <button class="btn-primary" style="width: 100%;" (click)="closeDetailsModal()">Close</button>
          </div>
        </div>
      </div>

      <!-- Share Modal -->
      <app-share-modal
        *ngIf="showShareModal()"
        [resourceId]="shareResourceId"
        [fileName]="shareFileName"
        [isFolder]="shareIsFolder"
        (close)="closeShareModal()">
      </app-share-modal>

      <!-- Global Toast Notifications -->
      <div *ngIf="toast.message()" 
           class="fixed bottom-10 right-10 px-8 py-4 rounded-2xl text-white shadow-2xl z-[1000] flex items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
           [ngClass]="{
             'bg-emerald-600': toast.type() === 'success',
             'bg-red-600': toast.type() === 'error',
             'bg-amber-600': toast.type() === 'warning',
             'bg-blue-600': toast.type() === 'info'
           }">
        <div class="flex items-center gap-3">
          <svg *ngIf="toast.type() === 'success'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <svg *ngIf="toast.type() === 'error'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          <span class="font-bold text-[15px]">{{ toast.message() }}</span>
        </div>
        
        <button *ngIf="toast.action()" 
                (click)="toast.action()?.run()" 
                class="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all backdrop-blur-sm border border-white/30 shadow-sm active:scale-95">
          {{ toast.action()?.label }}
        </button>
      </div>
   </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .drive-container {
      min-height: calc(100vh - 120px);
    }

    .upload-progress-card.cancelled {
      border-color: #fbbf24;
      background-color: #fffbeb;
    }
    
    .bg-cancelled {
      background: #fbbf24 !important;
    }
    
    .text-warning {
      color: #d97706;
    }

    .drive-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      gap: 16px;
    }

    .drive-top-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .drive-top-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .sort-dropdown {
      display: flex;
      align-items: center;
    }

    .sort-select {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 6px 36px 6px 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
      transition: all 0.2s;
    }

    .sort-select:hover {
      border-color: #d1d5db;
    }

    .sort-select:focus {
      outline: none;
      border-color: #5b4ee8;
      box-shadow: 0 0 0 2px rgba(91, 78, 232, 0.1);
    }

    .view-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .upload-progress-card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    }

    .upload-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .upload-progress-bar {
      height: 6px;
      background: #f3f4f6;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .upload-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4f46e5 0%, #818cf8 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .upload-progress-status {
      font-size: 11px;
      font-weight: 500;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .text-success { color: #10b981; }
    .text-danger { color: #ef4444; }
    .text-warning { color: #f59e0b; }

    .file-count {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
    }

    .selected-count {
      color: #5b4ee8;
      font-weight: 500;
    }

    .file-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .file-card {
      position: relative;
      background: var(--bg-card);
      border: 2px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .file-card:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .file-card.selected {
      border-color: #5b4ee8;
      background: rgba(91, 78, 232, 0.05);
    }

    .star-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      color: #fbbf24;
      z-index: 10;
    }

    .selection-checkbox {
      position: absolute;
      top: 8px;
      left: 32px;
      z-index: 10;
    }

    .custom-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid #d1d5db;
      cursor: pointer;
      accent-color: #5b4ee8;
      transition: all 0.2s;
    }

    .custom-checkbox:checked {
      border-color: #5b4ee8;
    }

    .file-type-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
    }

    .more-options-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px;
      border-radius: 6px;
      color: #9ca3af;
      opacity: 0;
      transition: all 0.2s;
      z-index: 10;
    }

    .file-card:hover .more-options-btn {
      opacity: 1;
    }

    .more-options-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .file-preview {
      width: 100%;
      aspect-ratio: 4/3;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      background: var(--bg-elevated);
    }

    .file-preview.pdf { background: rgba(239, 68, 68, 0.1); }
    .file-preview.docx { background: rgba(59, 130, 246, 0.1); }
    .file-preview.xlsx { background: rgba(16, 185, 129, 0.1); }
    .file-preview.pptx { background: rgba(249, 115, 22, 0.1); }
    .file-preview.txt { background: rgba(107, 114, 128, 0.1); }
    .file-preview.video { background: rgba(139, 92, 246, 0.1); }

    .file-preview-icon {
      width: 48px;
      height: 48px;
      opacity: 0.6;
    }

    .file-preview.pdf .file-preview-icon { color: #ef4444; }
    .file-preview.docx .file-preview-icon { color: #3b82f6; }
    .file-preview.xlsx .file-preview-icon { color: #10b981; }
    .file-preview.pptx .file-preview-icon { color: #f97316; }
    .file-preview.txt .file-preview-icon { color: #6b7280; }
    .file-preview.video .file-preview-icon { color: #8b5cf6; }

    .folder-preview-bg {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }

    .folder-icon {
      color: #3b82f6;
      opacity: 0.85;
      width: 56px;
      height: 56px;
      filter: drop-shadow(0 2px 3px rgba(59, 130, 246, 0.2));
    }

    .file-info {
      padding-top: 4px;
    }

    .file-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .file-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #9ca3af;
    }

    .file-status {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-dot.ready { background: #10b981; }

    .ai-indexed {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 11px;
      color: #5b4ee8;
    }

    /* Shared Indicators */
    .shared-indicator-icon {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      border: 1px solid #e5e7eb;
      z-index: 10;
    }

    .shared-badge-inline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    /* List View Styles */
    .file-list {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .file-list-header {
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) 150px 100px 100px 48px;
      gap: 16px;
      padding: 12px 16px;
      background: var(--bg-elevated);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-color);
    }

    .file-list-item {
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr) 150px 100px 100px 48px;
      gap: 16px;
      padding: 12px 16px;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background 0.15s;
    }

    .file-list-item:hover {
      background: var(--bg-elevated);
    }

    .file-list-item.selected {
      background: rgba(91, 78, 232, 0.05);
    }

    .file-list-col.checkbox-col {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .file-list-col.name {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .file-list-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .file-list-name {
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .star-indicator {
      margin-left: 8px;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-content {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      width: 400px;
      max-width: 90vw;
      animation: slideUp 0.2s ease-out;
      border: 1px solid var(--border-color);
    }

    .modal-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .modal-icon.danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 12px;
    }

    .modal-description {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }

    /* Dropzone */
    .dropzone-overlay {
      position: fixed;
      inset: 0;
      background: rgba(91, 78, 232, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 90;
      border: 3px dashed #5b4ee8;
    }

    .dropzone-content {
      text-align: center;
      padding: 48px;
      background: var(--bg-card);
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--border-color);
    }

    .dropzone-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      border-radius: 50%;
      background: rgba(91, 78, 232, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5b4ee8;
    }

    .dropzone-text {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .dropzone-subtext {
      font-size: 14px;
      color: #6b7280;
    }

    .empty-state-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 64px;
    }

    .file-card-skeleton {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
    }

    /* Bulk Action Toolbar */
    .bulk-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: #5b4ee8;
      color: white;
      z-index: 60;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(91, 78, 232, 0.4);
      animation: slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bulk-toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .bulk-close-btn {
      padding: 8px;
      border-radius: 50%;
      color: white;
      transition: background 0.2s;
    }

    .bulk-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .bulk-count {
      font-weight: 600;
      font-size: 16px;
    }

    .bulk-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bulk-action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s;
    }

    .bulk-action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .bulk-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .bulk-action-btn.danger:hover {
      background: #ef4444;
    }

    .loader-xs {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .error-banner {
      margin: 12px 24px;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05);
    }

    .error-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .error-content {
      display: flex;
      flex-direction: column;
    }

    .error-main {
      font-size: 14px;
      font-weight: 600;
      color: #991b1b;
    }

    .error-small {
      font-size: 11px;
      color: #b91c1c;
      opacity: 0.8;
      margin-top: 1px;
    }

    .error-banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .retry-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #dc2626;
      color: white;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      transition: all 0.2s;
    }

    .retry-btn:hover {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(185, 28, 28, 0.2);
    }

    .dismiss-btn {
      color: #6b7280;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 8px;
    }

    .dismiss-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    @keyframes slideInDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .loader-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .move-folder-item {
      color: #1f2937 !important;
    }
    
    .move-folder-item.active {
      color: #1e40af !important;
    }

    [data-theme="dark"] .move-folder-item {
      color: #f9fafb !important;
    }

    [data-theme="dark"] .move-folder-item.active {
      color: #1e40af !important; /* Keep blue on light blue highlight */
    }
  `]
})
export class DocumentsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('folderNameInput') folderNameInput!: ElementRef<HTMLInputElement>;

  // Stored listener references for cleanup
  private onDragOverBound: any;
  private onDragLeaveBound: any;
  private onDropBound: any;

  // State
  private uploadControllers = new Map<string, AbortController>();
  private recentlyUploaded = new Set<string>(); // Prevent rapid duplicate uploads (name_size key)
  searchQuery = '';
  selectedType = '';
  sortBy = 'recent';
  newFolderName = '';
  currentFolderId: string | null = null;
  currentFilter = signal<string | null>(null);

  formatFilterTitle(filter: string | null): string {
    if (!filter) return '';
    // Replace hyphens with spaces and titlecase
    return filter.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  autoRetryingIds = signal<Set<string>>(new Set());
  thumbnailMap = signal<Record<string, { status: string; url?: string; startTime?: number }>>({});

  // Signals
  viewMode = signal<'grid' | 'list'>('grid');
  isDragOver = signal(false);
  showDeleteModal = signal(false);
  showFolderModal = signal(false);
  showContextMenu = signal(false);
  showRenameModal = signal(false);
  showDetailsModal = signal(false);
  documentToDelete = signal<Document | null>(null);
  documentToRename = signal<Document | null>(null);
  documentDetails = signal<Document | null>(null);
  renameInputValue = '';

  // Move feature state
  showMoveModal = signal(false);
  documentToMove = signal<Document | null>(null);
  selectedDestinationFolderId = signal<string | null>(null);
  isMoving = signal(false);
  availableFolders = computed(() => {
    const docToMove = this.documentToMove();
    return this.documentService.documents().filter(doc =>
      doc.isFolder &&
      !(doc as any).isTrashed &&
      (!docToMove || (doc.documentId !== docToMove.documentId && docToMove.parentFolderId !== doc.documentId))
    );
  });

  // Copy feature state
  showCopyModal = signal(false);
  documentToCopy = signal<Document | null>(null);
  selectedCopyDestinationFolderId = signal<string | null>(null);
  isCopying = signal(false);
  availableFoldersForCopy = computed(() => {
    return this.documentService.documents().filter(doc => doc.isFolder && !(doc as any).isTrashed);
  });

  isDeleting = signal(false);
  filteredDocuments = signal<Document[]>([]);

  // OPTIMIZED: Centralized Reactive Selection State
  selectionService = inject(SelectionService);
  selectedFiles = toSignal(this.selectionService.selectedFiles$, { initialValue: [] });
  selectedCount = toSignal(this.selectionService.selectedCount$, { initialValue: 0 });

  // OPTIMIZED: Granular Loading States
  actionLoading = signal({
    delete: false,
    move: false,
    copy: false
  });

  isBulkProcessing = computed(() => {
    const l = this.actionLoading();
    return l.delete || l.move || l.copy;
  });

  // OPTIMIZED: Robust Error Handling & Retries
  showErrorBanner = signal(false);
  errorMessage = signal('');
  lastFailedAction = signal<{
    type: 'delete' | 'move' | 'copy',
    fileIds: string[],
    destinationId?: string | null
  } | null>(null);

  /**
   * Handle results from any bulk operation (success/failure/partial)
   */
  private handleBulkResponse(response: any, type: 'delete' | 'move' | 'copy', fileIds: string[], destinationId?: string | null) {
    const successIds = response.results?.success || [];
    const failed = response.results?.failed || [];
    const failedIds = failed.map((f: any) => f.id);

    if (successIds.length > 0) {
      if (failedIds.length === 0) {
        this.toast.success(`Successfully processed ${successIds.length} items.`);
        this.dismissError(); // Clear any existing banners
      } else {
        this.toast.warning(`Partial success: ${successIds.length} items OK, but ${failedIds.length} failed.`);
      }
    }

    if (failedIds.length > 0) {
      // KEEP failed items selected as requested
      this.selectionService.keepOnlyFailedItems(failedIds);

      // Show detailed error banner
      this.lastFailedAction.set({ type, fileIds: failedIds, destinationId });
      this.errorMessage.set(`Some ${type} operations failed due to permissions or server errors.`);
      this.showErrorBanner.set(true);
    } else {
      // Complete success
      this.clearSelection();
    }

    // Always reload documents to ensure UI is in sync with server state
    // (e.g. some might have been moved/deleted successfully even in partial failure)
    this.documentService.loadDocuments().then(() => {
      this.filterDocuments();
    });
  }

  async retryLastAction() {
    const last = this.lastFailedAction();
    if (!last) return;

    this.dismissError(); // Close banner while retrying
    console.log(`🔄 Retrying last failed ${last.type} action for ${last.fileIds.length} items...`);

    if (last.type === 'delete') {
      await this.bulkDelete();
    } else if (last.type === 'move') {
      // For move, we just use the same destination ID
      this.selectedDestinationFolderId.set(last.destinationId || null);
      this.confirmMove();
    } else if (last.type === 'copy') {
      this.selectedCopyDestinationFolderId.set(last.destinationId || null);
      this.confirmCopy();
    }
  }

  dismissError() {
    this.showErrorBanner.set(false);
    this.lastFailedAction.set(null);
  }

  private showNetworkError(type: 'delete' | 'move' | 'copy', fileIds: string[], destinationId: string | null = null) {
    this.toast.error('Could not reach the server.');
    this.errorMessage.set(`Network Error: ${type.charAt(0).toUpperCase() + type.slice(1)} operation failed. Please check your connection.`);
    this.lastFailedAction.set({ type, fileIds, destinationId });
    this.showErrorBanner.set(true);
    // Ensure items stay selected for retry
    this.selectionService.keepOnlyFailedItems(fileIds);
  }

  async bulkDelete() {
    const selected = this.selectedFiles();
    if (selected.length === 0) return;

    const filter = this.currentFilter();
    const isTrash = filter === 'trash';

    // PERMANENT DELETE (from trash) or MOVE TO TRASH
    const confirmMsg = isTrash
      ? `Permanently delete ${selected.length} items? This action cannot be undone.`
      : `Move ${selected.length} items to trash?`;

    if (confirm(confirmMsg)) {
      this.actionLoading.update(l => ({ ...l, delete: true }));
      const fileIds = selected.map(doc => doc.documentId);

      try {
        if (isTrash) {
          // PERMANENT
          const response = await this.documentService.bulkDelete(fileIds);
          this.handleBulkResponse(response, 'delete', fileIds);
        } else {
          // SOFT DELETE (Move to trash)
          const response = await this.documentService.bulkUpdateTrashStatus(fileIds, true);
          this.handleBulkResponse(response, 'delete', fileIds);

          this.toast.success(`${selected.length} items moved to trash`, {
            label: 'Undo',
            run: () => this.undoTrash(fileIds)
          });
        }
      } catch (error: any) {
        console.error('Bulk delete failed:', error);
        this.showNetworkError('delete', fileIds);
      } finally {
        this.actionLoading.update(l => ({ ...l, delete: false }));
      }
    }
  }

  async undoTrash(fileIds: string[]) {
    try {
      await this.documentService.bulkUpdateTrashStatus(fileIds, false);
      this.toast.success('Restored items.');
      await this.documentService.loadDocuments();
      this.filterDocuments();
    } catch (err) {
      this.toast.error('Failed to undo.');
    }
  }

  bulkMove() {
    const selected = this.selectedFiles();
    if (selected.length === 0) return;
    this.openMoveModal(selected[0]);
  }

  bulkCopy() {
    const selected = this.selectedFiles();
    if (selected.length === 0) return;
    this.openCopyModal(selected[0]);
  }

  // Reactive Preview State
  previewFileId = signal<string | null>(null);
  previewFile = computed(() => {
    const id = this.previewFileId();
    if (!id) return null;

    // 1. Prefer the realtime synced document if it matches the current preview
    const liveDoc = this.documentService.realtimeDoc();
    if (liveDoc && liveDoc.documentId === id) {
      return liveDoc as any;
    }

    // 2. Fallback: Look for it in the main documents list
    const doc = this.documentService.documents().find(d => d.documentId === id);
    if (doc) return doc as any;

    // 3. Last fallback: search in filtered documents (for shared files)
    return this.filteredDocuments().find(d => d.documentId === id) as any;
  });

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  // Context menu state
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuFile: CloudFile | null = null;

  // Share modal state
  showShareModal = signal(false);
  shareResourceId = '';
  shareFileName = '';
  shareIsFolder = false;

  constructor(
    public documentService: DocumentService,
    public settingsService: SettingsService,
    public toast: ToastService,
    private shareService: ShareService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Bind listeners once for consistent references
    this.onDragOverBound = this.handleDragOver.bind(this);
    this.onDragLeaveBound = this.handleDragLeave.bind(this);
    this.onDropBound = this.handleDrop.bind(this);

    // Auto-sync filteredDocuments when documents or share lists change
    effect(() => {
      const docs = this.documentService.documents();
      const sharedWithMe = this.shareService.sharedWithMe();
      const sharedByMe = this.shareService.sharedByMe();
      console.log('[Documents] Documents/Shares signal changed, docs count:', docs.length);
      this.syncThumbnails(docs);
      this.filterDocuments();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.documentService.loadDocuments();
    this.settingsService.loadSettings().subscribe();
    this.setupDragAndDrop();

    // Handle route query params for filters
    this.route.queryParams.subscribe(params => {
      this.currentFilter.set(params['filter'] || null);
      this.searchQuery = params['search'] || '';

      // FIX: Reset folder ID when navigating (e.g. from sidebar clicking My Files)
      // If folderId is provided in queryParams, use it, otherwise reset to null (Root)
      this.currentFolderId = params['folderId'] || null;

      if (this.currentFilter() === 'shared-with-me') {
        this.shareService.loadSharedWithMe();
      } else if (this.currentFilter() === 'shared-by-me') {
        this.shareService.loadSharedByMe();
      }

      this.filterDocuments();
    });
  }

  ngOnDestroy(): void {
    this.removeDragAndDrop();
  }

  // Setup drag and drop
  private setupDragAndDrop() {
    document.addEventListener('dragover', this.onDragOverBound);
    document.addEventListener('dragleave', this.onDragLeaveBound);
    document.addEventListener('drop', this.onDropBound);
  }

  private removeDragAndDrop() {
    document.removeEventListener('dragover', this.onDragOverBound);
    document.removeEventListener('dragleave', this.onDragLeaveBound);
    document.removeEventListener('drop', this.onDropBound);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeContextMenu();
      this.closePreview();
      this.closeFolderModal();
      this.clearSelection();
    }
    if (event.key === 'Delete' && this.selectedCount() > 0) {
      this.bulkDelete();
    }
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.types.includes('Files')) {
      this.isDragOver.set(true);
    }
  }

  handleDragLeave(event: DragEvent): void {
    if (event.relatedTarget === null) {
      this.isDragOver.set(false);
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadMultipleFiles(files);
    }
  }

  // File selection
  onFileClick(event: MouseEvent, doc: Document) {
    event.stopPropagation();
    const docs = this.filteredDocuments();
    const index = docs.findIndex(d => d.documentId === doc.documentId);

    if (event.shiftKey && this.selectionService.getLastSelectedIndex() !== -1) {
      // Shift-select range
      this.selectionService.selectRange(docs, this.selectionService.getLastSelectedIndex(), index);
    } else if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      this.selectionService.toggleSelection(doc, index);
    } else {
      // Single select
      this.selectionService.selectAll([doc]);
      this.selectionService.setLastSelectedIndex(index);
    }
  }

  onFileDoubleClick(doc: Document) {
    if ((doc as any).isFolder) {
      this.navigateToFolder(doc.documentId);
      return;
    }
    // Open preview by ID (reactive)
    this.previewFileId.set(doc.documentId);

    // REALTIME: Subscribe to document updates when opened
    this.documentService.subscribeToDocument(doc.documentId);
  }

  isSelected(doc: Document): boolean {
    return this.selectionService.isSelected(doc.documentId);
  }

  toggleSelection(doc: Document, event: Event) {
    event.stopPropagation();
    this.selectionService.toggleSelection(doc);
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectionService.selectAll(this.filteredDocuments());
    } else {
      this.selectionService.clearSelection();
    }
  }

  isAllSelected(): boolean {
    const filtered = this.filteredDocuments();
    return filtered.length > 0 && filtered.every(doc =>
      this.selectionService.isSelected(doc.documentId)
    );
  }

  isPartiallySelected(): boolean {
    const filtered = this.filteredDocuments();
    const selectedCount = filtered.filter(doc =>
      this.selectionService.isSelected(doc.documentId)
    ).length;
    return selectedCount > 0 && selectedCount < filtered.length;
  }

  clearSelection() {
    this.selectionService.clearSelection();
    this.closeContextMenu();
  }

  // Context menu
  onFileContextMenu(event: MouseEvent, doc: Document) {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuFile = doc as any;
    this.showContextMenu.set(true);

    if (!this.isSelected(doc)) {
      this.selectionService.selectAll([doc]);
    }
  }

  onBackgroundContextMenu(event: MouseEvent) {
    // Background right-click - could show "New folder" option
    event.preventDefault();
  }

  onMoreOptions(event: MouseEvent, doc: Document) {
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuFile = doc as any;
    this.showContextMenu.set(true);
  }

  closeContextMenu() {
    this.showContextMenu.set(false);
    this.contextMenuFile = null;
  }

  onContextMenuAction(action: string) {
    if (!this.contextMenuFile) return;

    switch (action) {
      case 'preview':
        if (this.contextMenuFile.isFolder) {
          this.navigateToFolder(this.contextMenuFile.documentId);
        } else {
          this.previewFileId.set(this.contextMenuFile.documentId);
          // REALTIME: Subscribe
          this.documentService.subscribeToDocument(this.contextMenuFile.documentId);
        }
        break;
      case 'download':
        this.downloadDocument(this.contextMenuFile as any);
        break;
      case 'star':
      case 'unstar':
        this.toggleStar(this.contextMenuFile as any);
        break;
      case 'rename':
        this.openRenameModal(this.contextMenuFile as any);
        break;
      case 'move':
        this.openMoveModal(this.contextMenuFile as any);
        break;
      case 'copy':
        this.openCopyModal(this.contextMenuFile as any);
        break;
      case 'delete':
        this.deleteDocument(this.contextMenuFile as any);
        break;
      case 'restore':
        this.restoreDocument(this.contextMenuFile as any);
        break;
      case 'delete-permanent':
        this.deleteDocumentPermanently(this.contextMenuFile as any);
        break;
      case 'details':
        this.openDetailsModal(this.contextMenuFile as any);
        break;
      case 'share':
        this.openShareModal(this.contextMenuFile as any);
        break;
      case 'stop-sharing':
        this.stopSharing(this.contextMenuFile as any);
        break;
    }
  }

  // Share modal operations
  openShareModal(doc: Document) {
    this.shareResourceId = doc.documentId;
    this.shareFileName = doc.fileName;
    this.shareIsFolder = !!(doc as any).isFolder;
    this.showShareModal.set(true);
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.shareResourceId = '';
    this.shareFileName = '';
    this.shareIsFolder = false;
  }

  stopSharing(doc: Document) {
    if (!confirm(`Are you sure you want to stop sharing "${doc.fileName}"? This will revoke access for all people.`)) return;

    this.shareService.stopSharing(doc.documentId).subscribe({
      next: () => {
        this.toast.success(`Stopped sharing "${doc.fileName}"`);
        // Refresh documents if needed, though stopSharing only affects the 'shares' collection
        // it's good to refresh to clear any local 'shared' flags if they exist
        this.documentService.loadDocuments();
      },
      error: (err) => {
        console.error('Failed to stop sharing:', err);
        this.toast.error('Failed to stop sharing. Please try again.');
      }
    });
  }

  // Star functionality
  toggleStar(doc: Document, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Flip the status based on current state
    const currentStatus = !!(doc as any).isStarred;
    const newStatus = !currentStatus;

    this.documentService.toggleStar(doc.documentId, newStatus).subscribe({
      next: () => {
        // Star status is optimistically updated in service
        // Re-filter if we are currently looking at the starred tab
        if (this.currentFilter() === 'starred') {
          this.filterDocuments();
        }
      },
      error: (err) => {
        console.error('Failed to toggle star:', err);
        // Revert on error
        this.documentService.toggleStar(doc.documentId, currentStatus).subscribe();
      }
    });
  }

  toggleStarFromPreview(doc: CloudFile) {
    this.toggleStar(doc as any);
  }

  // Folder operations
  showCreateFolderDialog() {
    console.log('[Documents] showCreateFolderDialog called');
    this.newFolderName = '';
    this.showFolderModal.set(true);
    console.log('[Documents] showFolderModal set to:', this.showFolderModal());
    setTimeout(() => this.folderNameInput?.nativeElement?.focus(), 100);
  }

  closeFolderModal() {
    this.showFolderModal.set(false);
    this.newFolderName = '';
  }

  createFolder() {
    if (!this.newFolderName.trim()) return;
    const name = this.newFolderName.trim();
    console.log('[Documents] Creating folder:', name, 'in parent:', this.currentFolderId);
    this.closeFolderModal();

    this.documentService.createFolder(name, this.currentFolderId).subscribe({
      next: (response) => {
        console.log('[Documents] Folder created successfully:', response);
        this.filterDocuments();
      },
      error: (err) => {
        console.error('[Documents] Failed to create folder:', err);
      }
    });
  }

  navigateToFolder(folderId: string | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folderId: folderId },
      queryParamsHandling: 'merge'
    });

    if (folderId === null) {
      this.breadcrumbs.set([]);
    } else {
      // Find the folder to get its name
      const allDocs = this.documentService.documents();
      const folder = allDocs.find(d => d.documentId === folderId);
      if (folder) {
        const newBreadcrumbs: BreadcrumbItem[] = [];
        let pFolder: Document | undefined = folder;
        while (pFolder) {
          newBreadcrumbs.unshift({ id: pFolder.documentId, name: pFolder.fileName });
          if ((pFolder as any).parentFolderId) {
            const pid: string = String((pFolder as any).parentFolderId);
            pFolder = allDocs.find(d => d.documentId === pid);
          } else {
            pFolder = undefined;
          }
        }
        this.breadcrumbs.set(newBreadcrumbs);
      }
    }
  }

  // Preview
  closePreview() {
    const id = this.previewFileId();
    if (id) {
      this.documentService.unsubscribeFromDocument(id);
    }
    this.previewFileId.set(null);
  }

  toggleDetails() {
    // TODO: Toggle details panel
  }

  // File operations
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadMultipleFiles(input.files);
      input.value = '';
    }
  }

  onFilesSelected(files: FileList) {
    this.uploadMultipleFiles(files);
  }

  cancelUpload(): void {
    const progress = this.documentService.uploadProgress();
    if (progress && progress.uploadId) {
      const controller = this.uploadControllers.get(progress.uploadId);
      if (controller) {
        controller.abort();
        this.uploadControllers.delete(progress.uploadId);
      }
      this.documentService.cancelUpload(progress.uploadId);
      setTimeout(() => {
        this.documentService.clearUploadProgress();
      }, 500);
    }
  }

  uploadMultipleFiles(files: FileList) {
    if (files.length === 0) return;
    Array.from(files).forEach(file => {
      this.uploadFile(file);
    });
  }

  uploadFile(file: File): void {
    // Prevent rapid duplicate uploads of the same file
    const fingerprint = `${file.name}_${file.size}_${file.lastModified}`;
    if (this.recentlyUploaded.has(fingerprint)) {
      console.warn('⚠️ [DocumentsComponent] Skipping duplicate upload trigger for:', file.name);
      return;
    }
    this.recentlyUploaded.add(fingerprint);
    // Auto-expire from guard after 3 seconds - allows re-uploading if needed later, but stops the initial burst
    setTimeout(() => this.recentlyUploaded.delete(fingerprint), 3000);

    // --- STEP 1: DYNAMIC SECURITY VALIDATION ---
    const config = this.documentService.systemConfig();

    // Default allowed types if config hasn't loaded (enhanced fallback)
    const fallbackTypes = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'jpg', 'jpeg', 'png', 'mp3', 'wav', 'mp4', 'mov', 'webp'];
    const allowedExtensions = config?.allowedFileTypes || fallbackTypes;
    const maxMB = config?.maxFileSizeMB || 50;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExtensionAllowed = ext ? allowedExtensions.includes(ext) : false;

    if (!isExtensionAllowed) {
      const allowedText = allowedExtensions.join(', ').toUpperCase();
      this.documentService.setUploadError(`Invalid file type. Only ${allowedText} are allowed at this time.`);
      return;
    }

    if (file.size > maxMB * 1024 * 1024) {
      this.documentService.setUploadError(`File too large. Maximum allowed size is ${maxMB}MB.`);
      return;
    }

    // --- STEP 2: PLAN-BASED LIMITS ---
    const userPlan = (this.authService.currentUser()?.plan || 'free').toLowerCase();
    const planConfig = PLANS[userPlan] || PLANS['free'];
    const planLimitMB = planConfig.uploadLimitMB;

    if (planLimitMB !== Infinity && file.size > planLimitMB * 1024 * 1024) {
      this.documentService.setUploadError(`File too large for your ${userPlan} plan. Limit is ${planLimitMB}MB.`);
      return;
    }

    let targetFolderId = this.currentFolderId;
    if (!targetFolderId) {
      const settings = this.settingsService.settings();
      if (settings?.storage?.defaultFolder && settings.storage.defaultFolder !== 'root' && settings.storage.defaultFolder !== 'auto') {
        targetFolderId = settings.storage.defaultFolder;
      }
    }

    // Safe UUID generation (fallback for non-secure contexts)
    const uploadId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    const abortController = new AbortController();
    this.uploadControllers.set(uploadId, abortController);

    this.documentService.uploadDocument(file, targetFolderId, abortController.signal, uploadId).subscribe({
      next: (doc) => {
        if (doc) {
          this.uploadControllers.delete(uploadId);

          // STEP 1: Immediately add to UI and set loading
          this.filterDocuments();

          // Initialize thumbnail state to loading
          this.thumbnailMap.update(map => ({
            ...map,
            [doc.documentId]: { status: 'loading' }
          }));

          // STEP 2: Trigger thumbnail generation
          this.generateThumbnailAfterUpload(doc);
        }
      },
      error: (err) => {
        this.documentService.setUploadError(err.message || 'Upload failed');
        this.uploadControllers.delete(uploadId);
        setTimeout(() => {
          if (this.documentService.uploadProgress()?.status === 'error') {
            this.documentService.clearUploadProgress();
          }
        }, 7000);
      },
      complete: () => {
        this.uploadControllers.delete(uploadId);
        setTimeout(() => {
          this.documentService.clearUploadProgress();
        }, 2000);
      }
    });
  }

  filterDocuments(): void {
    let docs = [...this.documentService.documents()];

    // Base filter: remove trashed items from all views except the Trash bin
    if (this.currentFilter() !== 'trash') {
      docs = docs.filter(doc => !(doc as any).isTrashed);
    }

    // Apply specific view routing logic
    if (this.currentFilter() === 'starred') {
      docs = docs.filter(doc => (doc as any).isStarred);
    } else if (this.currentFilter() === 'trash') {
      docs = docs.filter(doc => (doc as any).isTrashed);
    } else if (this.currentFilter() === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      docs = docs.filter(doc => new Date(doc.uploadedAt) > oneWeekAgo);
    } else if (this.currentFilter() === 'shared-with-me') {
      const sharedFiles = this.shareService.sharedWithMe();
      const sharedDocs: Document[] = sharedFiles.map((sf: any) => ({
        documentId: sf.resourceId,
        fileName: sf.fileName,
        fileType: sf.fileType,
        fileSize: sf.fileSize,
        storagePath: '',
        publicUrl: '',
        vectorCount: sf.vectorCount || 0,
        status: 'ready' as const,
        uploadedAt: sf.sharedAt,
        modifiedAt: sf.updatedAt,
        thumbnailUrl: sf.thumbnailUrl || undefined,
        thumbnailStatus: (sf.thumbnailStatus || 'ready') as any,
        isFolder: sf.isFolder,
        isStarred: false,
        isTrashed: false,
        lastEditedBy: sf.lastEditedBy,
        sharedWith: [],
        ownerUserId: sf.ownerUserId, // Critical for permission checks
        _sharedBy: sf.ownerName,
        _sharedByEmail: sf.ownerEmail,
        _sharePermission: sf.permission
      } as any));
      this.filteredDocuments.set(sharedDocs);
      return;
    } else if (this.currentFilter() === 'shared-by-me') {
      const groups = this.shareService.sharedByMe();
      const sharedDocs: Document[] = groups.map(g => ({
        documentId: g.resourceId,
        fileName: g.fileName,
        fileType: g.fileType || 'unknown',
        fileSize: 0,
        storagePath: '',
        publicUrl: '',
        vectorCount: 0,
        status: 'ready' as const,
        uploadedAt: g.recipients[0]?.sharedAt || new Date().toISOString(),
        isFolder: g.isFolder,
        isStarred: false,
        isTrashed: false,
        ownerUserId: this.authService.currentUser()?.uid, // Essential: I am the owner here
        sharedWith: g.recipients.map(r => r.recipientEmail),
        _recipientCount: g.recipients.filter(r => r.status !== 'revoked').length
      } as any));
      this.filteredDocuments.set(sharedDocs);
      return;
    }

    // Apply search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      docs = docs.filter(doc => doc.fileName.toLowerCase().includes(query));
    }

    // Apply folder routing logic
    if (!this.currentFilter() && !this.searchQuery.trim()) {
      docs = docs.filter(doc => {
        const parentId = (doc as any).parentFolderId || null;
        const normalizedParentId = parentId === 'root' ? null : parentId;
        const normalizedCurrentId = this.currentFolderId === 'root' ? null : this.currentFolderId;
        return normalizedParentId === normalizedCurrentId;
      });
    }

    // Sort: folders first, then by user choice
    docs.sort((a, b) => {
      const aIsFolder = (a as any).isFolder ? 1 : 0;
      const bIsFolder = (b as any).isFolder ? 1 : 0;
      if (aIsFolder !== bIsFolder) return bIsFolder - aIsFolder;

      if (this.sortBy === 'nameAsc') {
        return a.fileName.localeCompare(b.fileName);
      } else if (this.sortBy === 'nameDesc') {
        return b.fileName.localeCompare(a.fileName);
      } else if (this.sortBy === 'sizeDesc') {
        return (b.fileSize || 0) - (a.fileSize || 0);
      } else if (this.sortBy === 'sizeAsc') {
        return (a.fileSize || 0) - (b.fileSize || 0);
      } else if (this.sortBy === 'oldest') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      } else {
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    this.filteredDocuments.set(docs);
  }

  async downloadDocument(doc: any): Promise<void> {
    try {
      await this.documentService.downloadDocument(doc.documentId, doc.fileName);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }

  deleteDocument(doc: Document): void {
    this.documentToDelete.set(doc);
    this.showDeleteModal.set(true);
  }

  deleteDocumentPermanently(doc: Document): void {
    this.documentToDelete.set(doc);
    this.showDeleteModal.set(true);
  }

  restoreDocument(doc: Document): void {
    this.documentService.updateTrashStatus(doc.documentId, false).subscribe({
      next: () => {
        this.filterDocuments();
        this.clearSelection();
      },
      error: (err) => {
        console.error('Failed to restore:', err);
        this.documentService.updateTrashStatus(doc.documentId, true).subscribe();
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.documentToDelete.set(null);
  }

  // Rename features
  openRenameModal(doc: Document): void {
    this.documentToRename.set(doc);
    this.renameInputValue = doc.fileName;
    this.showRenameModal.set(true);
  }

  closeRenameModal(): void {
    this.showRenameModal.set(false);
    this.documentToRename.set(null);
    this.renameInputValue = '';
  }

  confirmRename(): void {
    const doc = this.documentToRename();
    if (!doc || !this.renameInputValue.trim()) return;

    this.documentService.renameDocument(doc.documentId, this.renameInputValue.trim()).subscribe({
      next: () => {
        this.filterDocuments();
        this.closeRenameModal();
      },
      error: (err) => console.error('Rename failed:', err)
    });
  }

  // Move features
  openMoveModal(doc: Document): void {
    this.documentToMove.set(doc);
    this.selectedDestinationFolderId.set(doc.parentFolderId || null);
    this.showMoveModal.set(true);
  }

  closeMoveModal(): void {
    this.showMoveModal.set(false);
    this.documentToMove.set(null);
    this.selectedDestinationFolderId.set(null);
  }

  selectMoveDestination(folderId: string | null): void {
    this.selectedDestinationFolderId.set(folderId);
  }

  confirmMove(): void {
    const selected = this.selectedFiles();
    const docToMove = this.documentToMove();

    // Robust selection: use bulk selection if available, otherwise just the specific document
    const fileIds = selected.length > 0
      ? selected.map(doc => doc.documentId)
      : (docToMove ? [docToMove.documentId] : []);

    if (fileIds.length === 0) {
      console.warn('⚠️ [DocumentsComponent] No files selected for move.');
      this.closeMoveModal();
      return;
    }

    const destinationId = this.selectedDestinationFolderId();

    // Safety check: if moving single item to same folder, just close
    if (fileIds.length === 1 && docToMove && docToMove.parentFolderId === destinationId) {
      this.closeMoveModal();
      return;
    }

    this.actionLoading.update(l => ({ ...l, move: true }));
    this.isMoving.set(true);

    this.documentService.bulkMove(fileIds, destinationId).then((response) => {
      this.handleBulkResponse(response, 'move', fileIds, destinationId);

      this.documentService.loadDocuments().then(() => {
        this.filterDocuments();
      });
      this.closeMoveModal();
    }).catch(err => {
      console.error('Bulk move network failure:', err);
      this.showNetworkError('move', fileIds, destinationId);
    }).finally(() => {
      this.isMoving.set(false);
      this.actionLoading.update(l => ({ ...l, move: false }));
    });
  }

  // Copy feature
  openCopyModal(doc: Document): void {
    this.documentToCopy.set(doc);
    this.selectedCopyDestinationFolderId.set(doc.parentFolderId || null);
    this.showCopyModal.set(true);
  }

  closeCopyModal(): void {
    this.showCopyModal.set(false);
    this.documentToCopy.set(null);
    this.selectedCopyDestinationFolderId.set(null);
  }

  selectCopyDestination(folderId: string | null): void {
    this.selectedCopyDestinationFolderId.set(folderId);
  }

  confirmCopy(): void {
    const selected = this.selectedFiles();
    const docToCopy = this.documentToCopy();

    // Optmized selection detection
    const fileIds = selected.length > 0
      ? selected.map(doc => doc.documentId)
      : (docToCopy ? [docToCopy.documentId] : []);

    if (fileIds.length === 0) return;

    this.actionLoading.update(l => ({ ...l, copy: true }));
    this.isCopying.set(true);
    const destinationId = this.selectedCopyDestinationFolderId();

    this.documentService.bulkCopy(fileIds, destinationId).then((response) => {
      this.handleBulkResponse(response, 'copy', fileIds, destinationId);

      this.documentService.loadDocuments();
      this.closeCopyModal();
      this.isCopying.set(false);
      this.actionLoading.update(l => ({ ...l, copy: false }));
    }).catch(err => {
      console.error('Bulk copy network failure:', err);
      this.showNetworkError('copy', fileIds, destinationId);
      this.isCopying.set(false);
      this.actionLoading.update(l => ({ ...l, copy: false }));
    });
  }

  // File Details features
  openDetailsModal(doc: Document): void {
    this.documentDetails.set(doc);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.documentDetails.set(null);
  }

  async confirmDelete(): Promise<void> {
    const doc = this.documentToDelete();
    if (!doc) return;

    this.isDeleting.set(true);
    try {
      if (this.currentFilter() === 'trash') {
        // PERMANENT DELETE
        await this.documentService.deleteDocument(doc.documentId);
      } else {
        // MOVE TO TRASH
        await this.documentService.updateTrashStatus(doc.documentId, true).toPromise();
      }
      this.cancelDelete();
      this.clearSelection();
      this.filterDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      // Revert optimistic update if soft-delete failed
      if (this.currentFilter() !== 'trash') {
        this.documentService.updateTrashStatus(doc.documentId, false).subscribe();
      }
    } finally {
      this.isDeleting.set(false);
    }
  }

  // Empty state helpers
  getEmptyStateTitle(): string {
    if (this.currentFilter() === 'starred') return 'No starred files';
    if (this.currentFilter() === 'trash') return 'Trash is empty';
    if (this.currentFilter() === 'recent') return 'No recent files';
    if (this.searchQuery) return 'No results found';
    return 'No files yet';
  }

  getEmptyStateDescription(): string {
    if (this.currentFilter() === 'starred') return 'Star files to find them quickly here.';
    if (this.currentFilter() === 'trash') return 'Items in trash will be deleted after 30 days.';
    if (this.currentFilter() === 'recent') return 'Files you open will appear here.';
    if (this.searchQuery) return `No files match "${this.searchQuery}"`;
    return 'Upload files to get started with CloudAI Smart Storage.';
  }

  getTypeBadgeClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'badge-pdf';
    if (type.includes('doc') || type.includes('word')) return 'badge-docx';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'badge-xlsx';
    if (type.includes('ppt') || type.includes('presentation')) return 'badge-pptx';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('webm')) return 'badge-video';
    return 'badge-txt';
  }

  getFileExtension(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('doc') || type.includes('word')) return 'DOCX';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'XLSX';
    if (type.includes('ppt') || type.includes('presentation')) return 'PPTX';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('webm')) return 'VIDEO';
    return 'TXT';
  }

  getFilePreviewClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('doc') || type.includes('word')) return 'docx';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'xlsx';
    if (type.includes('ppt') || type.includes('presentation')) return 'pptx';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('webm')) return 'video';
    return 'txt';
  }

  getIconBgClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'bg-red-50';
    if (type.includes('doc') || type.includes('word')) return 'bg-blue-50';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'bg-emerald-50';
    if (type.includes('ppt') || type.includes('presentation')) return 'bg-orange-50';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('webm')) return 'bg-purple-50';
    return 'bg-gray-50';
  }

  getIconColorClass(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'text-red-500';
    if (type.includes('doc') || type.includes('word')) return 'text-blue-500';
    if (type.includes('xls') || type.includes('spreadsheet')) return 'text-emerald-500';
    if (type.includes('ppt') || type.includes('presentation')) return 'text-orange-500';
    if (type.includes('video') || type.includes('mp4') || type.includes('mov') || type.includes('webm')) return 'text-purple-500';
    return 'text-gray-500';
  }

  getStatusClass(status: string): string {
    if (status === 'completed') return 'text-emerald-600';
    if (status === 'failed') return 'text-red-600';
    if (status === 'cancelled') return 'text-gray-500';
    return 'text-amber-600'; // uploading, processing
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'completed' || status === 'ready') return 'badge-success';
    if (status === 'failed') return 'badge-error';
    if (status === 'cancelled') return 'badge-secondary';
    return 'badge-warning'; // uploading, processing
  }

  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '--';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  handleThumbnailError(event: Event, doc: any) {
    if (doc) {
      console.error('Thumbnail load failed for:', doc.fileName, 'URL:', this.thumbnailMap()[doc.documentId]?.url);

      this.thumbnailMap.update(map => ({
        ...map,
        [doc.documentId]: { status: 'error' }
      }));
    }
  }

  private syncThumbnails(docs: Document[]) {
    // 1. Initialize map from LocalStorage if empty (cache)
    const currentMapStr = localStorage.getItem('thumbnail_cache');
    const cachedMap = currentMapStr ? JSON.parse(currentMapStr) : {};

    // 2. Use untracked to avoid infinite loop when modifying signal based on itself
    const currentMap = untracked(() => this.thumbnailMap());

    // If signal is empty but cache has data, we MUST mark as changed to populate it
    let changed = Object.keys(currentMap).length === 0 && Object.keys(cachedMap).length > 0;
    const newMap = { ...cachedMap, ...currentMap }; // Preserve current over cache

    console.log('[Thumbnails] Syncing', docs.length, 'docs. Map size:', Object.keys(newMap).length);

    docs.forEach(doc => {
      if (doc.isFolder) return;

      let existing = newMap[doc.documentId];
      const isBackendReady = doc.thumbnailStatus === 'ready' && doc.thumbnailUrl;
      const isBackendFailed = doc.thumbnailStatus === 'failed';
      const isBackendProcessing = doc.thumbnailStatus === 'processing' || doc.status === 'processing' || doc.status === 'uploading';

      // CASE 1: New document discovery
      if (!existing) {
        if (isBackendReady) {
          const timestamp = doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now();
          // Only append cache buster if it's a local thumb (not S3)
          const finalUrl = doc.thumbnailUrl?.startsWith('http') ? doc.thumbnailUrl : `${this.documentService.getThumbnailUrl(doc.thumbnailUrl)}?t=${timestamp}`;
          newMap[doc.documentId] = {
            status: 'ready',
            url: finalUrl
          };
          console.log('[Thumbnails] New doc discovered (Already Ready):', doc.fileName);
        } else if (isBackendFailed) {
          newMap[doc.documentId] = { status: 'error' };
        } else {
          newMap[doc.documentId] = { status: 'loading', startTime: Date.now() };
          console.log('[Thumbnails] New doc discovered (Processing...):', doc.fileName);
        }
        changed = true;
      }
      // CASE 2: Status Transitions
      else {
        // A. Backend finished processing (loading/error -> ready)
        if (existing.status !== 'ready' && isBackendReady) {
          const finalUrl = doc.thumbnailUrl?.startsWith('http') ? doc.thumbnailUrl : `${this.documentService.getThumbnailUrl(doc.thumbnailUrl)}?t=${Date.now()}`;
          newMap[doc.documentId] = {
            status: 'ready',
            url: finalUrl
          };
          changed = true;
          console.log('[Thumbnails] Signal READY for:', doc.fileName);
        }
        // B. Backend confirmed processing (error/unknown -> loading)
        else if (existing.status !== 'loading' && existing.status !== 'ready' && isBackendProcessing) {
          newMap[doc.documentId] = { status: 'loading', startTime: Date.now() };
          changed = true;
          console.log('[Thumbnails] Signal PROCESSING for:', doc.fileName);
        }
        // C. Backend confirmed failure (loading -> error)
        else if (existing.status === 'loading' && isBackendFailed) {
          newMap[doc.documentId] = { status: 'error' };
          changed = true;
          console.log('[Thumbnails] Signal FAILED for:', doc.fileName);
        }
        // D. URL Refresh (Stable sync with backend)
        else if (existing.status === 'ready' && doc.thumbnailUrl &&
          existing.url && !existing.url.includes(this.documentService.getThumbnailUrl(doc.thumbnailUrl))) {
          const finalUrl = doc.thumbnailUrl.startsWith('http') ? doc.thumbnailUrl : `${this.documentService.getThumbnailUrl(doc.thumbnailUrl)}?t=${doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now()}`;
          newMap[doc.documentId] = {
            ...existing,
            url: finalUrl
          };
          changed = true;
        }
      }
    });

    if (changed) {
      this.thumbnailMap.set(newMap);
      localStorage.setItem('thumbnail_cache', JSON.stringify(newMap));
    }

    // Trigger batch generation for files stuck in unknown state
    const docsToTrigger = docs.filter(doc => !doc.isFolder && newMap[doc.documentId]?.status === 'loading');
    if (docsToTrigger.length > 0) {
      console.log('[Thumbnails] Triggering generation for', docsToTrigger.length, 'files');
      this.triggerBatchThumbnailGeneration(docsToTrigger);
    }
  }

  /**
   * Identifies any docs in local map in 'loading' state and ensures they are triggered in batch
   */
  private async triggerBatchThumbnailGeneration(docs: Document[]) {
    if (!docs || docs.length === 0) return;

    // Use Promise.all for truly concurrent triggering across multiple files
    await Promise.all(docs.map(async (doc) => {
      try {
        await this.documentService.retryThumbnail(doc.documentId);
        // Step-by-step UI updates will be reactive via polling
      } catch (err) {
        // Individual file failure handling
        console.error(`[Thumbnail Batch] Failed for ${doc.fileName}:`, err);
        this.thumbnailMap.update(map => ({
          ...map,
          [doc.documentId]: { status: 'error' }
        }));
      }
    }));
  }

  /**
   * Asynchronously trigger thumbnail generation if needed
   */
  private async triggerThumbnailGeneration(doc: Document) {
    // If backend doesn't have it or failed, we trigger explicitly
    if (!doc.thumbnailUrl || doc.thumbnailStatus === 'failed') {
      try {
        console.log(`[Thumbnail] Triggering generation for ${doc.documentId} (${doc.fileName})`);
        await this.documentService.retryThumbnail(doc.documentId);
      } catch (err) {
        console.error(`[Thumbnail] Failed to trigger generation for ${doc.documentId}:`, err);
        // We don't mark as error yet, let the polling check status again or handle via UI
      }
    }
  }

  /**
   * Specifically handles thumbnail generation trigger after a new file upload
   */
  private async generateThumbnailAfterUpload(doc: Document) {
    try {
      console.log(`[Thumbnail] Triggering post-upload generation for ${doc.documentId}`);

      // We call the same generation trigger used elsewhere
      await this.triggerThumbnailGeneration(doc);

      // Step 3 will be handled automatically by DocumentService polling
      // and our component's reactive effect that calls syncThumbnails.
    } catch (err) {
      console.error(`[Thumbnail] Generation trigger failed for ${doc.documentId}:`, err);
    }
  }


  /**
   * Manual trigger for thumbnail generation (from UI)
   */
  async retryManualThumbnail(doc: Document, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    console.log(`[Thumbnail] Manual retry triggered for ${doc.documentId}`);

    // Set status back to loading + update start time
    this.thumbnailMap.update(map => ({
      ...map,
      [doc.documentId]: {
        status: 'loading',
        startTime: Date.now()
      }
    }));

    try {
      await this.documentService.retryThumbnail(doc.documentId);
    } catch (err) {
      console.error('[Thumbnail] Manual retry failed:', err);
      this.toast.error('Failed to start regeneration');
      this.thumbnailMap.update(map => ({
        ...map,
        [doc.documentId]: { status: 'error' }
      }));
    }
  }

  /**
   * Tracks elapsed loading time for a document
   */
  isLoadingTooLong(docId: string): boolean {
    const state = this.thumbnailMap()[docId];
    if (state?.status === 'loading' && state.startTime) {
      return (Date.now() - state.startTime) > 5000;
    }
    return false;
  }

  trackByDoc(index: number, doc: Document): string {
    return doc.documentId;
  }

  /**
   * Returns a representative emoji/icon for a given file type
   */
  getFileIcon(fileType: string): string {
    const type = (fileType || '').toLowerCase();

    if (type.includes('pdf')) return '📄';
    if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg')) return '🖼️';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('xlsx') || type.includes('sheet')) return '📊';
    if (type.includes('presentation') || type.includes('pptx') || type.includes('powerpoint')) return '📽️';
    if (type.includes('text') || type.includes('txt')) return '✍️';
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return '🎵';
    if (type.includes('video') || type.includes('mp4')) return '🎬';

    return '📄'; // Default icon
  }
}
