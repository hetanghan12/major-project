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

import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DocumentService, Document } from '../core/services/document.service';
import { SettingsService } from '../core/services/settings.service';
import { ShareService, SharedWithMeFile } from '../core/services/share.service';
import { ContextMenuComponent } from '../shared/context-menu/context-menu.component';
import { FilePreviewComponent } from '../shared/file-preview/file-preview.component';
import { NewButtonComponent } from '../shared/new-button/new-button.component';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb.component';
import { ShareModalComponent } from '../shared/share-modal/share-modal.component';
import { CloudFile, BreadcrumbItem } from '../core/models/file.model';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ContextMenuComponent,
    FilePreviewComponent,
    NewButtonComponent,
    BreadcrumbComponent,
    ShareModalComponent
  ],
  template: `
    <div class="drive-container animate-in" 
         (contextmenu)="onBackgroundContextMenu($event)"
         (click)="clearSelection()">
      
      <!-- Top Bar with New Button and Breadcrumbs -->
      <div class="drive-top-bar">
        <div class="drive-top-left">
          <ng-container *ngIf="!currentFilter">
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

          <ng-container *ngIf="currentFilter">
             <div class="flex items-center gap-3 text-2xl font-semibold text-gray-800 ml-2">
               <!-- Icons for different filters -->
               <svg *ngIf="currentFilter === 'starred'" class="w-7 h-7 text-yellow-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
               </svg>
               <svg *ngIf="currentFilter === 'trash'" class="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
               </svg>
               <svg *ngIf="currentFilter === 'recent'" class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <span class="text-gray-800">{{ currentFilter | titlecase }}</span>
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
        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.jpg,.jpeg,.png,.mp3,.wav"
        multiple
        (change)="onFileSelect($event)"
      />

      <!-- Upload Progress -->
      <div *ngIf="documentService.uploadProgress()" class="upload-progress-card">
        <div class="upload-progress-header">
          <span class="font-medium truncate">{{ documentService.uploadProgress()?.fileName }}</span>
          <span class="text-sm text-muted">{{ documentService.uploadProgress()?.progress }}%</span>
        </div>
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" [style.width.%]="documentService.uploadProgress()?.progress"></div>
        </div>
        <p class="upload-progress-status">
          <span *ngIf="documentService.uploadProgress()?.status === 'uploading'">Uploading...</span>
          <span *ngIf="documentService.uploadProgress()?.status === 'processing'" class="flex items-center gap-2">
            <span class="spinner w-3 h-3"></span>
            Processing & generating AI embeddings...
          </span>
          <span *ngIf="documentService.uploadProgress()?.status === 'complete'" class="text-success">
            ✓ Upload complete! File is ready.
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
          <button *ngIf="!currentFilter" (click)="fileInput.click()" class="btn-primary mt-4">
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
        <span *ngIf="selectedFiles().length > 0" class="selected-count">
          • {{ selectedFiles().length }} selected
        </span>
      </div>

      <!-- Grid View -->
      <div *ngIf="!documentService.isLoading() && filteredDocuments().length > 0 && viewMode() === 'grid'" 
           class="file-grid">
        <div *ngFor="let doc of filteredDocuments()" 
             class="file-card group"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
          <!-- Star Badge -->
          <button class="star-badge transition-all"
                  [class.opacity-0]="!doc.isStarred"
                  [class.group-hover:opacity-100]="!doc.isStarred"
                  [class.text-yellow-400]="doc.isStarred"
                  [class.text-gray-400]="!doc.isStarred"
                  (click)="toggleStar(doc, $event)"
                  [title]="doc.isStarred ? 'Remove from starred' : 'Add to starred'">
            <svg class="w-4 h-4" [attr.fill]="doc.isStarred ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </button>

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

            <!-- Placeholder Icon (for files) -->
            <svg *ngIf="!doc.isFolder && (!doc.thumbnailStatus || doc.thumbnailStatus === 'failed' || (!doc.thumbnailUrl && doc.thumbnailStatus !== 'processing'))" class="file-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            
            <!-- Skeleton/Processing state -->
            <div *ngIf="!doc.isFolder && doc.thumbnailStatus === 'processing'" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-80">
                <div class="spinner w-6 h-6 mb-2"></div>
                <span class="text-xs text-gray-500 font-medium tracking-wide">Processing...</span>
            </div>

            <!-- Actual Thumbnail -->
            <img *ngIf="!doc.isFolder && doc.thumbnailStatus === 'ready' && doc.thumbnailUrl" 
                 [src]="doc.thumbnailUrl" 
                 loading="lazy"
                 class="w-full h-full object-cover rounded-md"
                 (error)="handleThumbnailError($event, doc)"
                 [alt]="doc.fileName" />
          </div>

          <!-- File Info -->
          <div class="file-info">
            <h3 class="file-name" [title]="doc.fileName">{{ doc.fileName }}</h3>
            <div class="file-meta">
            <span class="file-size">{{ doc.isFolder ? 'Folder' : formatFileSize(doc.fileSize) }}</span>
            <span class="file-date">{{ formatDate(doc.uploadedAt) }}</span>
          </div>
          <div *ngIf="!doc.isFolder" class="file-status">
              <span [class]="getStatusBadgeClass(doc.status)">
                {{ doc.status === 'ready' ? 'Ready' : 'Processing' }}
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
          <div class="file-list-col name">Name</div>
          <div class="file-list-col modified">Modified</div>
          <div class="file-list-col size">Size</div>
          <div class="file-list-col status">Status</div>
          <div class="file-list-col actions w-12"></div>
        </div>

        <!-- List Items -->
        <div *ngFor="let doc of filteredDocuments()" 
             class="file-list-item group"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
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
            <span [class]="getStatusBadgeClass(doc.status)">{{ doc.status }}</span>
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
          <h3 class="modal-title">{{ currentFilter === 'trash' ? 'Delete permanently?' : 'Move to trash?' }}</h3>
          <p class="modal-description">
            "{{ documentToDelete()?.fileName }}" will be {{ currentFilter === 'trash' ? 'permanently deleted. This cannot be undone.' : 'moved to trash.' }}
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
            <button class="btn-danger" (click)="confirmDelete()" [disabled]="isDeleting()">
              <span *ngIf="!isDeleting()">{{ currentFilter === 'trash' ? 'Delete permanently' : 'Move to trash' }}</span>
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
                *ngFor="let folder of availableFolders()" 
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
                *ngFor="let folder of availableFoldersForCopy()" 
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .drive-container {
      min-height: calc(100vh - 120px);
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
      background-color: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 6px 36px 6px 12px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
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
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .upload-progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .upload-progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .upload-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22D3EE 0%, #5B4EE8 100%);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .upload-progress-status {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }

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
      background: white;
      border: 2px solid #e5e7eb;
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
      background: #f9fafb;
    }

    .file-preview.pdf { background: rgba(239, 68, 68, 0.1); }
    .file-preview.docx { background: rgba(59, 130, 246, 0.1); }
    .file-preview.xlsx { background: rgba(16, 185, 129, 0.1); }
    .file-preview.pptx { background: rgba(249, 115, 22, 0.1); }
    .file-preview.txt { background: rgba(107, 114, 128, 0.1); }

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
      font-weight: 500;
      font-size: 14px;
      color: #1f2937;
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

    /* List View Styles */
    .file-list {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .file-list-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px 100px 100px 48px;
      gap: 16px;
      padding: 12px 16px;
      background: #f9fafb;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb;
    }

    .file-list-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px 100px 100px 48px;
      gap: 16px;
      padding: 12px 16px;
      align-items: center;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.15s;
    }

    .file-list-item:hover {
      background: #f9fafb;
    }

    .file-list-item.selected {
      background: rgba(91, 78, 232, 0.05);
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
      color: #1f2937;
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
      background: white;
      border-radius: 16px;
      padding: 24px;
      width: 400px;
      max-width: 90vw;
      animation: slideUp 0.2s ease-out;
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
      color: #1f2937;
      margin-bottom: 12px;
    }

    .modal-description {
      font-size: 14px;
      color: #6b7280;
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
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
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
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 64px;
    }

    .file-card-skeleton {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
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
  searchQuery = '';
  selectedType = '';
  sortBy = 'recent';
  newFolderName = '';
  currentFolderId: string | null = null;
  currentFilter: string | null = null;

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
      doc.isFolder && (!docToMove || (doc.documentId !== docToMove.documentId && docToMove.parentFolderId !== doc.documentId))
    );
  });

  // Copy feature state
  showCopyModal = signal(false);
  documentToCopy = signal<Document | null>(null);
  selectedCopyDestinationFolderId = signal<string | null>(null);
  isCopying = signal(false);
  availableFoldersForCopy = computed(() => {
    return this.documentService.documents().filter(doc => doc.isFolder);
  });

  isDeleting = signal(false);
  filteredDocuments = signal<Document[]>([]);
  selectedFiles = signal<Document[]>([]);
  previewFile = signal<CloudFile | null>(null);
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
    public shareService: ShareService,
    private route: ActivatedRoute
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
      this.filterDocuments();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.documentService.loadDocuments();
    this.settingsService.loadSettings().subscribe();
    this.setupDragAndDrop();

    // Handle route query params for filters
    this.route.queryParams.subscribe(params => {
      this.currentFilter = params['filter'] || null;
      this.searchQuery = params['search'] || '';

      if (this.currentFilter === 'shared-with-me') {
        this.shareService.loadSharedWithMe();
      } else if (this.currentFilter === 'shared-by-me') {
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
    if (event.key === 'Delete' && this.selectedFiles().length > 0) {
      this.deleteDocument(this.selectedFiles()[0]);
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

    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const current = this.selectedFiles();
      if (this.isSelected(doc)) {
        this.selectedFiles.set(current.filter(f => f.documentId !== doc.documentId));
      } else {
        this.selectedFiles.set([...current, doc]);
      }
    } else {
      // Single select
      this.selectedFiles.set([doc]);
    }
  }

  onFileDoubleClick(doc: Document) {
    if ((doc as any).isFolder) {
      this.navigateToFolder(doc.documentId);
      return;
    }
    // Open preview
    this.previewFile.set(doc as any);
  }

  isSelected(doc: Document): boolean {
    return this.selectedFiles().some(f => f.documentId === doc.documentId);
  }

  clearSelection() {
    this.selectedFiles.set([]);
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
      this.selectedFiles.set([doc]);
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
          this.previewFile.set(this.contextMenuFile);
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
        if (this.currentFilter === 'starred') {
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
    this.currentFolderId = folderId;
    this.filterDocuments();

    // Update breadcrumbs
    if (folderId === null) {
      this.breadcrumbs.set([]);
    } else {
      // Find the folder to get its name
      const allDocs = this.documentService.documents();
      const folder = allDocs.find(d => d.documentId === folderId);
      if (folder) {
        // Find ancestry here if we want deep breadcrumbs. 
        // For now just put the current folder.
        // A robust solution would recursively find parent folders.
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
    this.previewFile.set(null);
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

  uploadMultipleFiles(files: FileList) {
    if (files.length === 0) return;

    // Process all files
    Array.from(files).forEach(file => {
      this.uploadFile(file);
    });
  }

  uploadFile(file: File): void {
    const validTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.jpg', '.jpeg', '.png', '.mp3', '.wav'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(ext)) {
      this.documentService.setUploadError('Invalid file type. Please upload PDF, DOCX, XLSX, PPTX, TXT, image or audio files.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      this.documentService.setUploadError('File too large. Maximum size is 50MB.');
      return;
    }

    let targetFolderId = this.currentFolderId;
    if (!targetFolderId) {
      const settings = this.settingsService.settings();
      if (settings?.storage?.defaultFolder && settings.storage.defaultFolder !== 'root' && settings.storage.defaultFolder !== 'auto') {
        targetFolderId = settings.storage.defaultFolder;
      }
    }

    this.documentService.uploadDocument(file, targetFolderId).subscribe({
      error: (err) => {
        this.documentService.setUploadError(err.message || 'Upload failed');
      },
      complete: () => {
        setTimeout(() => {
          this.documentService.clearUploadProgress();
        }, 2000);
      }
    });
  }

  filterDocuments(): void {
    let docs = [...this.documentService.documents()];

    // Base filter: remove trashed items from all views except the Trash bin
    if (this.currentFilter !== 'trash') {
      docs = docs.filter(doc => !(doc as any).isTrashed);
    }

    // Apply specific view routing logic
    if (this.currentFilter === 'starred') {
      docs = docs.filter(doc => (doc as any).isStarred);
    } else if (this.currentFilter === 'trash') {
      docs = docs.filter(doc => (doc as any).isTrashed);
    } else if (this.currentFilter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      docs = docs.filter(doc => new Date(doc.uploadedAt) > oneWeekAgo);
    } else if (this.currentFilter === 'shared-with-me') {
      const sharedFiles = this.shareService.sharedWithMe();
      // Convert shared files to Document format for display
      const sharedDocs: Document[] = sharedFiles.map((sf: SharedWithMeFile) => ({
        documentId: sf.resourceId,
        fileName: sf.fileName,
        fileType: sf.fileType,
        fileSize: sf.fileSize,
        storagePath: '',
        publicUrl: '',
        vectorCount: 0,
        status: 'ready' as const,
        uploadedAt: sf.sharedAt,
        thumbnailUrl: sf.thumbnailUrl || undefined,
        thumbnailStatus: (sf.thumbnailStatus || 'ready') as any,
        isFolder: sf.isFolder,
        isStarred: false,
        isTrashed: false,
        sharedWith: [],
        _sharedBy: sf.ownerName,
        _sharedByEmail: sf.ownerEmail,
        _sharePermission: sf.permission
      } as any));
      this.filteredDocuments.set(sharedDocs);
      return;
    } else if (this.currentFilter === 'shared-by-me') {
      // For now, show files from sharedByMe groups
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
    if (!this.currentFilter && !this.searchQuery.trim()) {
      docs = docs.filter(doc => ((doc as any).parentFolderId || null) === this.currentFolderId);
    }

    // Sort: folders first, then by user choice
    docs.sort((a, b) => {
      // Folders always come first
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
        // default: 'recent'
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
    });

    this.filteredDocuments.set(docs);
  }

  async downloadDocument(doc: Document): Promise<void> {
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
    const doc = this.documentToMove();
    if (!doc) return;

    this.isMoving.set(true);
    this.documentService.moveDocument(doc.documentId, this.selectedDestinationFolderId()).subscribe({
      next: () => {
        this.filterDocuments();
        this.closeMoveModal();
        this.isMoving.set(false);
      },
      error: (err) => {
        console.error('Move failed:', err);
        this.isMoving.set(false);
      }
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
    const doc = this.documentToCopy();
    if (!doc) return;

    this.isCopying.set(true);
    this.documentService.copyDocument(doc.documentId, this.selectedCopyDestinationFolderId()).subscribe({
      next: () => {
        this.filterDocuments();
        this.closeCopyModal();
        this.isCopying.set(false);
      },
      error: (err) => {
        console.error('Copy failed:', err);
        this.isCopying.set(false);
      }
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
      if (this.currentFilter === 'trash') {
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
      if (this.currentFilter !== 'trash') {
        this.documentService.updateTrashStatus(doc.documentId, false).subscribe();
      }
    } finally {
      this.isDeleting.set(false);
    }
  }

  // Empty state helpers
  getEmptyStateTitle(): string {
    if (this.currentFilter === 'starred') return 'No starred files';
    if (this.currentFilter === 'trash') return 'Trash is empty';
    if (this.currentFilter === 'recent') return 'No recent files';
    if (this.searchQuery) return 'No results found';
    return 'No files yet';
  }

  getEmptyStateDescription(): string {
    if (this.currentFilter === 'starred') return 'Star files to find them quickly here.';
    if (this.currentFilter === 'trash') return 'Items in trash will be deleted after 30 days.';
    if (this.currentFilter === 'recent') return 'Files you open will appear here.';
    if (this.searchQuery) return `No files match "${this.searchQuery}"`;
    return 'Upload files to get started with CloudAI Smart Storage.';
  }

  // Utility methods
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

  getFilePreviewClass(fileType: string): string {
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
    return status === 'ready' ? 'text-emerald-600' : 'text-amber-600';
  }

  getStatusBadgeClass(status: string): string {
    return status === 'ready' ? 'badge-success' : 'badge-warning';
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
      console.error('Thumbnail load failed for:', doc.fileName, 'URL:', doc.thumbnailUrl, 'Event:', event);
      doc.thumbnailStatus = 'failed';
    }
  }
}
