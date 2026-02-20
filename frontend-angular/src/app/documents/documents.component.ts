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

import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DocumentService, Document } from '../core/services/document.service';
import { ContextMenuComponent } from '../shared/context-menu/context-menu.component';
import { FilePreviewComponent } from '../shared/file-preview/file-preview.component';
import { NewButtonComponent } from '../shared/new-button/new-button.component';
import { BreadcrumbComponent } from '../shared/breadcrumb/breadcrumb.component';
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
    BreadcrumbComponent
  ],
  template: `
    <div class="drive-container animate-in" 
         (contextmenu)="onBackgroundContextMenu($event)"
         (click)="clearSelection()">
      
      <!-- Top Bar with New Button and Breadcrumbs -->
      <div class="drive-top-bar">
        <div class="drive-top-left">
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
        </div>

        <div class="drive-top-right">
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
        accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.jpg,.jpeg,.png"
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
             class="file-card"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
          <!-- Star Badge -->
          <button *ngIf="doc.isStarred" 
                  class="star-badge"
                  (click)="toggleStar($event, doc)"
                  title="Remove from starred">
            <svg class="w-4 h-4" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </button>

          <!-- File Type Badge -->
          <span [class]="getTypeBadgeClass(doc.fileType)" class="file-type-badge">
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
          <div class="file-preview" [class]="getFilePreviewClass(doc.fileType)">
            <svg class="file-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>

          <!-- File Info -->
          <div class="file-info">
            <h3 class="file-name" [title]="doc.fileName">{{ doc.fileName }}</h3>
            <div class="file-meta">
              <span>{{ formatFileSize(doc.fileSize) }}</span>
              <span class="file-status" [class]="getStatusClass(doc.status)">
                <span *ngIf="doc.status === 'ready'" class="status-dot ready"></span>
                <span *ngIf="doc.status === 'processing'" class="spinner w-3 h-3"></span>
                {{ doc.status === 'ready' ? 'Ready' : 'Processing' }}
              </span>
            </div>
            <!-- AI Index indicator -->
            <div *ngIf="doc.vectorCount" class="ai-indexed">
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
        </div>

        <!-- List Items -->
        <div *ngFor="let doc of filteredDocuments()" 
             class="file-list-item"
             [class.selected]="isSelected(doc)"
             (click)="onFileClick($event, doc)"
             (dblclick)="onFileDoubleClick(doc)"
             (contextmenu)="onFileContextMenu($event, doc)">
          
          <div class="file-list-col name">
            <div class="file-list-icon" [class]="getIconBgClass(doc.fileType)">
              <svg class="w-5 h-5" [class]="getIconColorClass(doc.fileType)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span class="file-list-name">{{ doc.fileName }}</span>
            <button *ngIf="doc.isStarred" class="star-indicator">
              <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </button>
          </div>
          
          <div class="file-list-col modified">{{ formatDate(doc.uploadedAt) }}</div>
          <div class="file-list-col size">{{ formatFileSize(doc.fileSize) }}</div>
          <div class="file-list-col status">
            <span [class]="getStatusBadgeClass(doc.status)">{{ doc.status }}</span>
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
          <h3 class="modal-title">Move to trash?</h3>
          <p class="modal-description">
            "{{ documentToDelete()?.fileName }}" will be moved to trash.
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
            <button class="btn-danger" (click)="confirmDelete()" [disabled]="isDeleting()">
              <span *ngIf="!isDeleting()">Move to trash</span>
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
          <p class="dropzone-subtext">PDF, DOCX, TXT, images (max 10MB)</p>
        </div>
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
      grid-template-columns: 1fr 150px 100px 100px;
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
      grid-template-columns: 1fr 150px 100px 100px;
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
  documentToDelete = signal<Document | null>(null);
  isDeleting = signal(false);
  filteredDocuments = signal<Document[]>([]);
  selectedFiles = signal<Document[]>([]);
  previewFile = signal<CloudFile | null>(null);
  breadcrumbs = signal<BreadcrumbItem[]>([]);

  // Context menu state
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuFile: CloudFile | null = null;

  constructor(
    public documentService: DocumentService,
    private route: ActivatedRoute
  ) {
    // Bind listeners once for consistent references
    this.onDragOverBound = this.handleDragOver.bind(this);
    this.onDragLeaveBound = this.handleDragLeave.bind(this);
    this.onDropBound = this.handleDrop.bind(this);

    // Auto-sync filteredDocuments when documents change
    effect(() => {
      const docs = this.documentService.documents();
      console.log('[Documents] Documents signal changed, count:', docs.length);
      this.filterDocuments();
    });
  }

  ngOnInit(): void {
    this.documentService.loadDocuments();
    this.setupDragAndDrop();

    // Handle route query params for filters
    this.route.queryParams.subscribe(params => {
      this.currentFilter = params['filter'] || null;
      this.searchQuery = params['search'] || '';
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
        this.previewFile.set(this.contextMenuFile);
        break;
      case 'download':
        this.downloadDocument(this.contextMenuFile as any);
        break;
      case 'star':
      case 'unstar':
        this.toggleStar(null, this.contextMenuFile as any);
        break;
      case 'rename':
        // TODO: Implement rename
        break;
      case 'delete':
        this.deleteDocument(this.contextMenuFile as any);
        break;
      case 'details':
        this.previewFile.set(this.contextMenuFile);
        break;
    }
  }

  // Star functionality
  // Star functionality
  toggleStar(event: MouseEvent | null, doc: Document) {
    event?.stopPropagation();
    const newStatus = !doc.isStarred;

    this.documentService.toggleStar(doc.documentId, newStatus).subscribe({
      error: (err) => {
        console.error('Failed to toggle star:', err);
        // Revert on error
        this.documentService.toggleStar(doc.documentId, !newStatus);
      }
    });
  }

  toggleStarFromPreview(doc: CloudFile) {
    this.toggleStar(null, doc as any);
  }

  // Folder operations
  showCreateFolderDialog() {
    this.newFolderName = '';
    this.showFolderModal.set(true);
    setTimeout(() => this.folderNameInput?.nativeElement?.focus(), 100);
  }

  closeFolderModal() {
    this.showFolderModal.set(false);
    this.newFolderName = '';
  }

  createFolder() {
    if (!this.newFolderName.trim()) return;
    // TODO: Implement folder creation API
    console.log('Create folder:', this.newFolderName);
    this.closeFolderModal();
  }

  navigateToFolder(folderId: string | null) {
    this.currentFolderId = folderId;
    this.filterDocuments();
    // Update breadcrumbs
    if (folderId === null) {
      this.breadcrumbs.set([]);
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
    const validTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.jpg', '.jpeg', '.png'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(ext)) {
      this.documentService.setUploadError('Invalid file type. Please upload PDF, DOCX, XLSX, PPTX, TXT, or image files.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.documentService.setUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    this.documentService.uploadDocument(file).subscribe({
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

    // Apply filter
    if (this.currentFilter === 'starred') {
      docs = docs.filter(doc => (doc as any).isStarred);
    } else if (this.currentFilter === 'trash') {
      docs = docs.filter(doc => (doc as any).isTrashed);
    } else if (this.currentFilter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      docs = docs.filter(doc => new Date(doc.uploadedAt) > oneWeekAgo);
    } else {
      // Normal view - exclude trashed
      docs = docs.filter(doc => !(doc as any).isTrashed);
    }

    // Apply search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      docs = docs.filter(doc => doc.fileName.toLowerCase().includes(query));
    }

    // Sort
    docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

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

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.documentToDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const doc = this.documentToDelete();
    if (!doc) return;

    this.isDeleting.set(true);
    try {
      await this.documentService.deleteDocument(doc.documentId);
      this.showDeleteModal.set(false);
      this.documentToDelete.set(null);
    } catch (error) {
      console.error('Delete failed:', error);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
