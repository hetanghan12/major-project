/**
 * File Preview Modal - Google Drive Style
 * =========================================
 * Preview PDF, images, text files, and spreadsheets inline
 * 
 * FIXED: Properly loads files from backend download endpoint
 * ADDED: Native XLSX viewer using SpreadsheetViewerComponent
 */

import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CloudFile } from '../../core/models/file.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { SpreadsheetViewerComponent } from '../spreadsheet-viewer/spreadsheet-viewer.component';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-file-preview',
    imports: [CommonModule, SpreadsheetViewerComponent, FormsModule],
    template: `
        <div class="preview-overlay" (click)="onClose()">
            <div class="preview-container" (click)="$event.stopPropagation()">
                <!-- Header -->
                <div class="preview-header">
                    <div class="preview-title">
                        <span [class]="getFileIconClass()">{{ getFileIcon() }}</span>
                        <span>{{ file?.fileName }}</span>
                        
                        <!-- View Only Badge -->
                        <span *ngIf="isReadOnly" class="view-only-badge">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Only
                        </span>
                    </div>
                    <div class="preview-actions">
                        <!-- Save Button (Only for text files with edit permission) -->
                        <button *ngIf="canEdit && isText()" 
                                class="save-action-btn" 
                                [disabled]="isSaving || !hasChanges"
                                (click)="onSave()">
                            <span *ngIf="!isSaving">Save</span>
                            <div *ngIf="isSaving" class="spinner-small"></div>
                        </button>
                        <button class="preview-action-btn" title="Download" (click)="onDownload()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        </button>
                        <button class="preview-action-btn" [title]="file?.isStarred ? 'Remove star' : 'Add star'" (click)="onStar()">
                            <svg class="w-5 h-5" [class.starred]="file?.isStarred" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                            </svg>
                        </button>
                        <button class="preview-action-btn" title="Open in new tab" (click)="openInNewTab()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                        </button>
                        <button class="preview-close-btn" title="Close" (click)="onClose()">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Preview Content -->
                <div class="preview-content">
                    <!-- Loading State -->
                    <div *ngIf="isLoading" class="loading-state">
                        <div class="spinner-large"></div>
                        <p>Loading preview...</p>
                    </div>

                    <!-- Error State -->
                    <div *ngIf="loadError && !isLoading" class="error-state">
                        <div class="error-icon">
                            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                        <h3>Preview not available</h3>
                        <p>{{ loadError }}</p>
                        <button class="btn-primary mt-4" (click)="onDownload()">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download instead
                        </button>
                    </div>

                    <!-- PDF Preview using Blob URL -->
                    <ng-container *ngIf="!isLoading && !loadError && isPDF()">
                        <iframe 
                            *ngIf="directPdfUrl" 
                            [src]="directPdfUrl" 
                            class="pdf-preview"
                            frameborder="0">
                        </iframe>
                        <!-- Fallback message if no URL -->
                        <div *ngIf="!directPdfUrl" class="loading-state">
                            <div class="spinner-large"></div>
                            <p>Loading PDF...</p>
                        </div>
                    </ng-container>

                    <!-- Image Preview -->
                    <ng-container *ngIf="!isLoading && !loadError && isImage()">
                        <img 
                            *ngIf="imageUrl"
                            [src]="imageUrl" 
                            [alt]="file?.fileName"
                            class="image-preview"
                            (load)="isLoading = false"
                            (error)="onImageError()"/>
                    </ng-container>

                    <!-- Text/Document Preview -->
                    <ng-container *ngIf="!isLoading && !loadError && isText()">
                        <div class="text-preview">
                            <!-- Permission Error Message Overlay (Only when not authorized) -->
                            <div *ngIf="showPermissionError" class="permission-error-banner">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                {{ permissionErrorMessage }}
                            </div>

                            <textarea 
                                *ngIf="canEdit"
                                class="text-editor"
                                [(ngModel)]="textContent"
                                (input)="onContentChange()">
                            </textarea>
                            <pre *ngIf="!canEdit && textContent">{{ textContent }}</pre>
                            
                            <div *ngIf="!textContent && !canEdit && !showPermissionError" class="text-preview-loading">
                                <div class="spinner"></div>
                                <span>Loading content...</span>
                            </div>
                        </div>
                    </ng-container>

                    <!-- DOCX Preview - Full HTML Rendering -->
                    <ng-container *ngIf="!isLoading && !loadError && isDocx()">
                        <!-- HTML Preview loaded from backend -->
                        <iframe 
                            *ngIf="docxPreviewUrl" 
                            [src]="docxPreviewUrl" 
                            class="docx-html-preview"
                            frameborder="0"
                            (load)="onDocxPreviewLoad()"
                            (error)="onDocxPreviewError()">
                        </iframe>
                        
                        <!-- Loading state for DOCX -->
                        <div *ngIf="!docxPreviewUrl && docxLoading" class="loading-state">
                            <div class="spinner-large"></div>
                            <p>Loading DOCX preview...</p>
                        </div>
                        
                        <!-- Fallback if preview fails -->
                        <div *ngIf="!docxPreviewUrl && !docxLoading && docxError" class="docx-fallback">
                            <div class="docx-icon">
                                <svg class="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" 
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <h3>{{ file?.fileName }}</h3>
                            <p class="file-info">Word Document • {{ formatFileSize(file?.fileSize || 0) }}</p>
                            <p class="error-message">{{ docxError }}</p>
                            <div class="docx-actions">
                                <button class="btn-primary" (click)="onDownload()">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                    </svg>
                                    Download
                                </button>
                            </div>
                        </div>
                    </ng-container>

                    <!-- Excel Preview (XLSX/XLS) - Native Spreadsheet Viewer -->
                    <ng-container *ngIf="!isLoading && !loadError && isExcel()">
                        <div class="spreadsheet-wrapper">
                            <app-spreadsheet-viewer
                                [file]="getSpreadsheetFile()"
                                (close)="onClose()"
                                (download)="onDownload()">
                            </app-spreadsheet-viewer>
                        </div>
                    </ng-container>

                    <!-- PPTX Preview -->
                    <ng-container *ngIf="!isLoading && !loadError && isPpt()">
                        <iframe 
                            *ngIf="officePreviewUrl" 
                            [src]="officePreviewUrl" 
                            class="pdf-preview"
                            frameborder="0"
                            (load)="onIframeLoad()">
                        </iframe>
                        <div *ngIf="!officePreviewUrl && pptLoading" class="loading-state">
                            <div class="spinner-large"></div>
                            <p>Loading presentation preview...</p>
                        </div>
                    </ng-container>

                    <!-- Audio Preview - Premium Glassmorphic Design -->
                    <ng-container *ngIf="!isLoading && !loadError && isAudio()">
                        <div class="audio-viewer-container">
                            <div class="audio-card">
                                <div class="audio-visualizer">
                                    <div class="music-icon-wrapper">
                                        <div class="music-waves">
                                            <span></span><span></span><span></span><span></span><span></span>
                                        </div>
                                        <svg class="w-24 h-24 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 1.12-3 2.5S3.343 19 5 19s3-1.12 3-2.5V8.55l8-1.6V12.114A4.369 4.369 0 0015 12c-1.657 0-3 1.12-3 2.5s1.343 2.5 3 2.5 3-1.12 3-2.5V3z"/>
                                        </svg>
                                    </div>
                                </div>
                                <div class="audio-info">
                                    <h3 class="audio-title">{{ file?.fileName }}</h3>
                                    <p class="audio-meta">{{ file?.fileType?.toUpperCase() }} • {{ formatFileSize(file?.fileSize || 0) }}</p>
                                </div>
                                <div class="audio-player-wrapper">
                                    <audio *ngIf="audioUrl" controls [src]="audioUrl" class="modern-audio-player"></audio>
                                </div>
                            </div>
                        </div>
                    </ng-container>
                    
                    <!-- Video Preview -->
                    <ng-container *ngIf="!isLoading && !loadError && isVideo()">
                        <div class="video-preview w-full h-full flex items-center justify-center bg-black">
                            <video 
                                *ngIf="videoUrl" 
                                controls 
                                autoplay 
                                [src]="videoUrl" 
                                class="max-w-full max-h-full">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </ng-container>

                    <!-- Unsupported Format -->
                    <ng-container *ngIf="!isLoading && !loadError && !isPDF() && !isImage() && !isText() && !isDocx() && !isExcel() && !isPpt() && !isAudio() && !isVideo()">

                        <div class="unsupported-preview">
                            <div class="unsupported-icon">
                                <span class="text-6xl">{{ getFileIcon() }}</span>
                            </div>
                            <h3>Preview not available</h3>
                            <p>This file type ({{ file?.fileType?.toUpperCase() }}) cannot be previewed. Download to view.</p>
                            <button class="btn-primary mt-4" (click)="onDownload()">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download
                            </button>
                        </div>
                    </ng-container>
                </div>

                <!-- File Details Sidebar -->
                <div class="preview-sidebar" *ngIf="showDetails">
                    <h3 class="sidebar-title">File details</h3>
                    <div class="detail-item">
                        <span class="detail-label">Type</span>
                        <span class="detail-value">{{ file?.fileType?.toUpperCase() }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Size</span>
                        <span class="detail-value">{{ formatFileSize(file?.fileSize || 0) }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created</span>
                        <span class="detail-value">{{ formatDate(file?.uploadedAt) }}</span>
                    </div>
                    <div class="detail-item" *ngIf="file?.vectorCount">
                        <span class="detail-label">AI Indexed</span>
                        <span class="detail-value">{{ file?.vectorCount }} chunks</span>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .preview-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .preview-container {
            width: 95vw;
            height: 95vh;
            max-width: 1400px;
            background: #1f2937;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .preview-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: #111827;
            border-bottom: 1px solid #374151;
        }

        .preview-title {
            display: flex;
            align-items: center;
            gap: 12px;
            color: white;
            font-weight: 500;
        }

        .preview-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .preview-action-btn {
            padding: 8px;
            border-radius: 8px;
            color: #9ca3af;
            transition: all 0.2s;
        }

        .preview-action-btn:hover {
            background: #374151;
            color: white;
        }

        .preview-action-btn .starred {
            color: #fbbf24;
            fill: #fbbf24;
        }

        .preview-close-btn {
            padding: 8px;
            border-radius: 8px;
            color: #9ca3af;
            transition: all 0.2s;
            margin-left: 8px;
        }

        .preview-close-btn:hover {
            background: #ef4444;
            color: white;
        }

        .preview-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: white;
        }

        .loading-state, .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: #6b7280;
            text-align: center;
            padding: 48px;
        }

        .error-icon {
            color: #ef4444;
        }

        .error-state h3 {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
        }

        .spinner-large {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #5b4ee8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        .pdf-preview {
            width: 100%;
            height: 100%;
            border: none;
        }

        .image-preview {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .text-preview {
            width: 100%;
            height: 100%;
            padding: 24px;
            overflow: auto;
            background: #1f2937;
        }

        .text-preview pre {
            color: #e5e7eb;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .text-preview-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: #9ca3af;
        }

        .docx-preview {
            text-align: center;
            padding: 48px;
            color: #1f2937;
        }

        .docx-icon {
            color: #3b82f6;
            margin-bottom: 24px;
        }

        .docx-preview h3 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .file-info {
            color: #6b7280;
            margin-bottom: 24px;
        }

        .docx-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-bottom: 24px;
        }

        .preview-hint {
            font-size: 14px;
            color: #9ca3af;
        }

        .docx-html-preview {
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        }

        .docx-fallback {
            text-align: center;
            padding: 48px;
            color: #1f2937;
        }

        .error-message {
            color: #ef4444;
            font-size: 14px;
            margin-bottom: 16px;
        }

        .unsupported-preview {
            text-align: center;
            color: #1f2937;
            padding: 48px;
        }

        .unsupported-icon {
            margin-bottom: 24px;
        }

        .unsupported-preview h3 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .unsupported-preview p {
            color: #6b7280;
        }

        .preview-sidebar {
            width: 280px;
            background: #1f2937;
            border-left: 1px solid #374151;
            padding: 20px;
            color: white;
        }

        .sidebar-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #9ca3af;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 16px;
        }

        .detail-label {
            font-size: 12px;
            color: #6b7280;
        }

        .detail-value {
            font-size: 14px;
            color: #e5e7eb;
        }

        .file-icon-pdf { color: #ef4444; }
        .file-icon-docx { color: #3b82f6; }
        .file-icon-txt { color: #6b7280; }
        .file-icon-folder { color: #fbbf24; }

        .view-only-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            background: #374151;
            color: #9ca3af;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-left: 8px;
            border: 1px solid #4b5563;
        }

        .save-action-btn {
            padding: 6px 16px;
            background: #5b4ee8;
            color: white;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            margin-right: 8px;
        }

        .save-action-btn:hover:not(:disabled) {
            background: #6b5df0;
        }

        .save-action-btn:disabled {
            background: #374151;
            color: #6b7280;
            cursor: not-allowed;
        }

        .text-editor {
            width: 100%;
            height: 100%;
            background: transparent;
            color: #e5e7eb;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            line-height: 1.6;
            padding: 0;
            border: none;
            outline: none;
            resize: none;
        }

        .spinner-small {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #374151;
            border-top-color: #5b4ee8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #5B4EE8 0%, #6B5DF0 100%);
            color: white;
            border-radius: 12px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-primary:hover {
            box-shadow: 0 4px 12px rgba(91, 78, 232, 0.35);
            transform: translateY(-1px);
        }

        .permission-error-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #f87171;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 16px;
            animation: fadeIn 0.3s ease-out;
        }

        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: white;
            color: #374151;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-secondary:hover {
            background: #f9fafb;
            border-color: #d1d5db;
        }

        /* Excel Preview Styles */
        .excel-preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 24px;
        }

        .excel-preview-image {
            max-width: 100%;
            max-height: 60vh;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid #374151;
        }

        .excel-download-hint {
            margin-top: 24px;
            text-align: center;
        }

        .excel-download-hint p {
            color: #9ca3af;
            font-size: 14px;
            margin-bottom: 16px;
        }

        .excel-fallback {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 48px;
        }

        .excel-icon {
            width: 96px;
            height: 96px;
            margin-bottom: 24px;
        }

        .excel-fallback h3 {
            font-size: 18px;
            font-weight: 600;
            color: #e5e7eb;
            margin-bottom: 8px;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .excel-actions {
            margin-top: 24px;
        }

        .file-icon-xlsx { color: #10b981; }

        /* Spreadsheet wrapper - fills entire preview content */
        .spreadsheet-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .spreadsheet-wrapper app-spreadsheet-viewer {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        /* ==================== AUDIO VIEWER ==================== */
        .audio-viewer-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
        }

        .audio-card {
            width: 90%;
            max-width: 500px;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(71, 85, 105, 0.3);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .audio-visualizer {
            margin-bottom: 30px;
            display: flex;
            justify-content: center;
        }

        .music-icon-wrapper {
            position: relative;
            background: rgba(16, 185, 129, 0.1);
            width: 140px;
            height: 140px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(16, 185, 129, 0.2);
        }

        .music-waves {
            position: absolute;
            display: flex;
            align-items: center;
            gap: 4px;
            bottom: 25px;
        }

        .music-waves span {
            width: 4px;
            height: 8px;
            background: #10b981;
            border-radius: 2px;
            animation: wave 1.2s ease-in-out infinite;
        }

        .music-waves span:nth-child(2) { animation-delay: 0.1s; height: 16px; }
        .music-waves span:nth-child(3) { animation-delay: 0.2s; height: 12px; }
        .music-waves span:nth-child(4) { animation-delay: 0.3s; height: 20px; }
        .music-waves span:nth-child(5) { animation-delay: 0.4s; height: 10px; }

        @keyframes wave {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(2.5); }
        }

        .audio-info {
            margin-bottom: 30px;
        }

        .audio-title {
            font-size: 20px;
            font-weight: 600;
            color: #f1f5f9;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .audio-meta {
            font-size: 14px;
            color: #94a3b8;
        }

        .audio-player-wrapper {
            width: 100%;
        }

        .modern-audio-player {
            width: 100%;
            height: 48px;
            border-radius: 12px;
            filter: invert(100%) hue-rotate(180deg) brightness(1.5); /* Make standard player dark-theme friendly */
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class FilePreviewComponent implements OnInit, OnChanges {
    @Input() file: CloudFile | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() download = new EventEmitter<CloudFile>();
    @Output() star = new EventEmitter<CloudFile>();

    // Preview URLs
    googleDocsUrl: SafeResourceUrl | null = null;
    directPdfUrl: SafeResourceUrl | null = null;
    imageUrl: string = '';
    textContent: string = '';
    docxPreviewUrl: SafeResourceUrl | null = null;
    excelPreviewUrl: string = '';
    officePreviewUrl: SafeResourceUrl | null = null;
    audioUrl: SafeResourceUrl | null = null;
    videoUrl: SafeResourceUrl | null = null;

    // State
    isLoading: boolean = true;
    isSaving: boolean = false;
    hasChanges: boolean = false;
    loadError: string = '';
    showDetails: boolean = false;
    docxLoading: boolean = false;
    docxError: string = '';
    excelLoading: boolean = false;
    excelError: string = '';
    pptLoading: boolean = false;

    private apiUrl = environment.apiUrl;

    constructor(
        private sanitizer: DomSanitizer,
        private authService: AuthService,
        private documentService: DocumentService,
        private http: HttpClient
    ) { }

    @HostListener('document:keydown.escape')
    onEscapeKey() {
        this.onClose();
    }

    ngOnInit() {
        this.loadPreview();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['file'] && this.file) {
            // Update content if it changed and we're not currently editing a modified version
            if (!this.hasChanges && (this.file as any).content !== undefined) {
                this.textContent = (this.file as any).content;
            }
            this.loadPreview();
        }
    }

    private loadPreview() {
        if (!this.file) {
            this.loadError = 'No file selected';
            this.isLoading = false;
            return;
        }

        this.isLoading = true;
        this.loadError = '';
        this.googleDocsUrl = null;
        this.directPdfUrl = null;
        this.imageUrl = '';
        this.textContent = '';
        this.docxPreviewUrl = null;
        this.docxLoading = false;
        this.docxError = '';
        this.officePreviewUrl = null;
        this.pptLoading = false;
        this.audioUrl = null;

        console.log('[FilePreview] Loading preview for:', this.file.fileName, 'Type:', this.file.fileType);

        // For authenticated files, we need to fetch with auth token and create blob URL
        if (this.isPDF()) {
            this.loadPdfPreviewWithAuth();
        } else if (this.isImage()) {
            this.loadImagePreviewWithAuth();
        } else if (this.isText()) {
            this.loadTextPreviewWithAuth();
        } else if (this.isDocx()) {
            // DOCX - Load HTML preview
            this.isLoading = false;
            this.loadDocxPreviewWithAuth();
        } else if (this.isExcel()) {
            // XLSX/XLS - Load thumbnail preview
            this.isLoading = false;
            this.loadExcelPreviewWithAuth();
        } else if (this.isPpt()) {
            this.loadPptPreviewWithAuth();
        } else if (this.isAudio()) {
            this.loadAudioPreviewWithAuth();
        } else if (this.isVideo()) {
            this.loadVideoPreviewWithAuth();
        } else {
            this.isLoading = false;
        }
    }

    private async loadPdfPreviewWithAuth() {
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');

            // 1. Fetch document metadata first to get fresh signed URL
            // HttpClient automatically adds Authorization and ngrok-skip-browser-warning
            const metaData: any = await this.http.get(`${this.apiUrl}/secure/documents/${docId}`).toPromise();

            if (metaData && metaData.success && metaData.document?.signedUrl) {
                console.log('[FilePreview] Using direct S3 signed URL');
                this.directPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(metaData.document.signedUrl);
                this.isLoading = false;
                return;
            }

            // 2. Fallback: Fetch via proxy if no signed URL (legacy files)
            console.log('[FilePreview] Falling back to proxy fetch');
            const previewUrl = `${this.apiUrl}/secure/documents/${docId}/view`;
            const blob = await this.http.get(previewUrl, { responseType: 'blob' }).toPromise();
            
            if (!blob) throw new Error('Failed to fetch document blob');

            const blobUrl = URL.createObjectURL(blob);
            this.directPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
            this.isLoading = false;

        } catch (error: any) {
            console.error('[FilePreview] PDF load error:', error);
            this.loadError = error.message || 'Failed to load PDF';
            this.isLoading = false;
        }
    }


    private async loadImagePreviewWithAuth() {
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');

            // 1. Fetch document metadata first to get fresh signed URL
            const metaData: any = await this.http.get(`${this.apiUrl}/secure/documents/${docId}`).toPromise();

            if (metaData && metaData.success && metaData.document?.signedUrl) {
                console.log('[FilePreview] Using direct S3 signed URL for image');
                this.imageUrl = metaData.document.signedUrl;
                this.isLoading = false;
                return;
            }

            // 2. Fallback to blob fetch (legacy)
            console.log('[FilePreview] Falling back to proxy fetch for image');
            const blob = await this.http.get(`${this.apiUrl}/secure/documents/${docId}/view`, { responseType: 'blob' }).toPromise();
            
            if (!blob) throw new Error('Failed to fetch image blob');

            this.imageUrl = URL.createObjectURL(blob);
            this.isLoading = false;

        } catch (error: any) {
            console.error('[FilePreview] Image load error:', error);
            this.loadError = error.message || 'Failed to load image';
            this.isLoading = false;
        }
    }

    private async loadTextPreviewWithAuth() {
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');

            // NEW: Use direct reactive content if available
            if ((this.file as any)?.content !== undefined) {
                console.log('[FilePreview] Using reactive content from sync');
                this.textContent = (this.file as any).content;
                this.isLoading = false;
                return;
            }

            // 1. Fetch document metadata first to get fresh signed URL
            let downloadUrl = `${this.apiUrl}/secure/documents/${docId}/view`;
            let isS3Url = false;

            try {
                const metaData: any = await this.http.get(`${this.apiUrl}/secure/documents/${docId}`).toPromise();
                if (metaData?.success && metaData.document?.signedUrl) {
                    console.log('[FilePreview] Using direct S3 signed URL for text');
                    downloadUrl = metaData.document.signedUrl;
                    isS3Url = true;
                }
            } catch (e) {
                console.warn('[FilePreview] Failed to fetch metadata, falling back to proxy');
            }

            // 2. Fetch Text content
            // Note: For S3 direct URLs, we use native fetch because HttpClient interceptor 
            // will try to add ngrok headers which will trigger CORS on S3
            if (isS3Url) {
                const response = await fetch(downloadUrl);
                this.textContent = await response.text();
            } else {
                this.textContent = await this.http.get(downloadUrl, { responseType: 'text' }).toPromise() || '';
            }
            
            this.isLoading = false;
            console.log('[FilePreview] Text loaded successfully');

        } catch (error: any) {
            console.error('[FilePreview] Text load error:', error);
            this.loadError = error.message || 'Failed to load text content';
            this.isLoading = false;
        }
    }

    private async loadDocxPreviewWithAuth() {
        this.docxLoading = true;
        this.docxError = '';
        this.docxPreviewUrl = null;

        try {
            const docId = (this.file as any)?.documentId;
            if (!docId) throw new Error('Document ID not found');

            console.log('[FilePreview] Loading DOCX preview via HttpClient:', docId);

            // Fetch HTML preview from backend
            const htmlContent = await this.http.get(`${this.apiUrl}/secure/documents/${docId}/preview`, { responseType: 'text' }).toPromise();

            if (!htmlContent) throw new Error('Empty preview content');

            // Get HTML content and create blob URL
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);

            this.docxPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
            this.docxLoading = false;
            console.log('[FilePreview] DOCX preview loaded successfully');
        } catch (error: any) {
            console.error('[FilePreview] DOCX preview load error:', error);
            this.docxError = error.message || 'Failed to load DOCX preview';
            this.docxLoading = false;
        }
    }

    onDocxPreviewLoad() {
        console.log('[FilePreview] DOCX iframe loaded');
        this.docxLoading = false;
    }

    onDocxPreviewError() {
        console.error('[FilePreview] DOCX iframe failed to load');
        this.docxError = 'Failed to render document preview';
        this.docxLoading = false;
    }

    private async loadExcelPreviewWithAuth() {
        this.excelLoading = true;
        this.excelError = '';

        try {
            const docId = (this.file as any)?.documentId;
            if (!docId) throw new Error('No document ID available');

            // First, try to use the generated thumbnail/preview from S3 or local DB
            let previewUrl = (this.file as any)?.previewUrl || (this.file as any)?.thumbnailUrl;

            if (previewUrl) {
                previewUrl = this.documentService.getThumbnailUrl(previewUrl);
                this.excelPreviewUrl = previewUrl;
                this.excelLoading = false;
                return;
            }

            // Fallback: Try to get thumbnail from local storage
            const localThumbUrl = `${this.apiUrl.replace('/api', '')}/api/thumbnails/${docId}.png`;
            
            // Test if thumbnail exists using HttpClient
            try {
                await this.http.head(localThumbUrl).toPromise();
                this.excelPreviewUrl = localThumbUrl;
                this.excelLoading = false;
            } catch (e) {
                this.excelError = 'Spreadsheet preview not yet generated. Use Download to view.';
                this.excelLoading = false;
            }
        } catch (error: any) {
            console.error('[FilePreview] Excel preview load error:', error);
            this.excelError = error.message || 'Failed to load spreadsheet preview';
            this.excelLoading = false;
        }
    }

    onExcelPreviewError() {
        console.error('[FilePreview] Excel preview image failed to load');
        this.excelError = 'Failed to load spreadsheet preview';
        this.excelLoading = false;
    }

    private async loadPptPreviewWithAuth() {
        this.pptLoading = true;
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');

            const metaData: any = await this.http.get(`${this.apiUrl}/secure/documents/${docId}`).toPromise();

            if (metaData?.success && metaData.document?.signedUrl) {
                const signedUrl = metaData.document.signedUrl;
                // Use Google Docs Viewer for PPTX
                const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`;
                this.officePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
                this.isLoading = false;
                return;
            }
            throw new Error('Could not generate secure view link for PowerPoint');
        } catch (error: any) {
            console.error('PPT load error:', error);
            this.loadError = error.message;
            this.pptLoading = false;
            this.isLoading = false;
        }
    }

    private async loadAudioPreviewWithAuth() {
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');

            console.log('[FilePreview] Fetching audio blob via proxy...');
            const blob = await this.http.get(`${this.apiUrl}/secure/documents/${docId}/view`, { 
                responseType: 'blob',
                reportProgress: true
            }).toPromise();
            
            if (!blob) throw new Error('Audio fetch failed');

            this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
            this.isLoading = false;
        } catch (error: any) {
            console.error('[FilePreview] Audio load error:', error);
            this.loadError = 'Failed to load audio. Please check your connection.';
            this.isLoading = false;
        }
    }

    private async loadVideoPreviewWithAuth() {
        try {
            const docId = this.getDocId();
            if (!docId) throw new Error('Document ID not found');
            
            console.log('[FilePreview] Fetching video blob via proxy...');
            const blob = await this.http.get(`${this.apiUrl}/secure/documents/${docId}/view`, { 
                responseType: 'blob',
                reportProgress: true
            }).toPromise();
            
            if (!blob) throw new Error('Video fetch failed');

            this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
            this.isLoading = false;
        } catch (error: any) {
            console.error('[FilePreview] Video load error:', error);
            this.loadError = 'Failed to load video. This could be due to file size or browser compatibility.';
            this.isLoading = false;
        }
    }

    private async getAuthToken(): Promise<string> {
        // Use AuthService to get the token
        try {
            const token = await this.authService.getToken();
            if (token) {
                return token;
            }
        } catch (e) {
            console.warn('[FilePreview] AuthService token retrieval failed:', e);
        }

        // Fallback: Try Firebase directly
        try {
            // @ts-ignore - Firebase auth might be on window
            const auth = (window as any).firebase?.auth?.();
            if (auth?.currentUser) {
                return await auth.currentUser.getIdToken();
            }
        } catch (e) {
            console.warn('[FilePreview] Firebase auth not available');
        }

        throw new Error('Authentication required. Please log in again.');
    }

    // Permission Helpers
    get isReadOnly(): boolean {
        const currentUserId = this.authService.currentUser()?.uid;
        const ownerId = (this.file as any)?.ownerUserId || (this.file as any)?.userId;

        // Step 2: Check if currentUserId == ownerUserId
        if (currentUserId && ownerId && (currentUserId === ownerId)) {
            return false; // Owner is never read-only
        }

        // Step 3 & 4: Check if user has edit permission via shares
        const sharePermission = (this.file as any)?._sharePermission;
        if (sharePermission === 'edit') {
            return false; // Has edit permission, so not read-only
        }

        return true; // Default to read-only for others
    }

    get canEdit(): boolean {
        const currentUserId = this.authService.currentUser()?.uid;
        const ownerId = (this.file as any)?.ownerUserId || (this.file as any)?.userId;
        const sharePermission = (this.file as any)?._sharePermission;
        const resourceId = (this.file as any)?.documentId;

        // Temporary Debug Logging
        console.log('[DEBUG] Permission Check:', {
            currentUserId,
            ownerUserId: ownerId,
            sharePermission,
            resourceId
        });

        // Step 2: Check if currentUserId == ownerUserId
        // Ownership always grants full permission and skips shares check
        if (currentUserId && ownerId && (currentUserId === ownerId)) {
            console.log('[FilePreview] Edit permission granted: User is owner');
            return true;
        }

        // Step 3 & 4: If user is not the owner, check share permission
        // Correct order: only allow edit if permission is explicitly "edit"
        if (sharePermission === 'edit') {
            console.log('[FilePreview] Edit permission granted via share');
            return true;
        }

        // Fallback for new uploads (if uploader is the owner, caught above; 
        // if uploader is not owner, they shouldn't be editing unless shared)
        const status = (this.file as any)?.status;
        if (status === 'uploading' || status === 'processing') {
            return true;
        }

        console.log('[FilePreview] Edit permission denied');
        return false;
    }

    /**
     * Requirement: Only show the error message "You do not have permission to edit this document"
     * when: 1. user is NOT the owner, 2. no valid share exists, 3. permission is not "edit"
     */
    get showPermissionError(): boolean {
        const currentUserId = this.authService.currentUser()?.uid;
        const ownerId = (this.file as any)?.ownerUserId || (this.file as any)?.userId;

        // If user is owner, never show this error
        if (currentUserId && ownerId && (currentUserId === ownerId)) {
            return false;
        }

        // Check if a valid edit share exists
        const sharePermission = (this.file as any)?._sharePermission;
        const hasEditShare = sharePermission === 'edit';

        // Show error if NOT owner AND does NOT have edit share
        return !hasEditShare;
    }

    get permissionErrorMessage(): string {
        return 'You do not have permission to edit this document.';
    }

    onContentChange() {
        this.hasChanges = true;
    }

    async onSave() {
        if (!this.file || this.isSaving || !this.hasChanges) return;

        const docId = (this.file as any).documentId;
        if (!docId) return;

        this.isSaving = true;
        try {
            await this.documentService.saveDocumentContent(docId, this.textContent);
            this.hasChanges = false;
            console.log('✅ Changes saved successfully');
        } catch (error) {
            console.error('❌ Failed to save changes:', error);
            alert('Failed to save changes. Please try again.');
        } finally {
            this.isSaving = false;
        }
    }

    private getDownloadUrl(): string {
        // Use the publicUrl if available (direct S3 URL)
        if (this.file?.publicUrl) {
            return this.file.publicUrl;
        }

        // Otherwise use the backend download endpoint
        // This requires authentication, so we need to use the document ID
        const docId = (this.file as any)?.documentId;
        if (docId) {
            return `${this.apiUrl}/secure/documents/${docId}/download`;
        }

        // Fallback to storage path
        return this.file?.storagePath || '';
    }

    onIframeLoad() {
        console.log('[FilePreview] Iframe loaded successfully');
        this.isLoading = false;
    }

    onIframeError() {
        console.error('[FilePreview] Iframe failed to load');
        // Try direct PDF if Google Docs fails
        this.googleDocsUrl = null;
    }

    onImageError() {
        console.error('[FilePreview] Image failed to load');
        this.loadError = 'Failed to load image';
        this.isLoading = false;
    }

    openInNewTab() {
        const url = this.getDownloadUrl();
        if (url) {
            window.open(url, '_blank');
        }
    }

    openInGoogleDocs() {
        const downloadUrl = this.getDownloadUrl();
        const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}`;
        window.open(googleViewerUrl, '_blank');
    }

    isPDF(): boolean {
        const type = this.file?.fileType?.toLowerCase() || '';
        return type === 'pdf' || type === 'application/pdf';
    }

    isImage(): boolean {
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return imageTypes.includes(type) || type.startsWith('image/');
    }

    isText(): boolean {
        const textTypes = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'py', 'log'];
        const type = this.file?.fileType?.toLowerCase() || '';
        const isCsv = type === 'csv' || type === 'text/csv' || this.file?.fileName?.toLowerCase().endsWith('.csv');
        return (textTypes.includes(type) || type.startsWith('text/')) && !isCsv;
    }

    isDocx(): boolean {
        const docTypes = ['docx', 'doc', 'odt', 'rtf'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return docTypes.includes(type) ||
            type.includes('word') ||
            type.includes('document') ||
            type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    isExcel(): boolean {
        const excelTypes = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'csv'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return excelTypes.includes(type) ||
            type.includes('spreadsheet') ||
            type.includes('excel') ||
            type.includes('csv') ||
            type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            type === 'application/vnd.ms-excel' ||
            type === 'text/csv';
    }

    isPpt(): boolean {
        const types = ['pptx', 'ppt', 'pps'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return types.includes(type) || type.includes('powerpoint') || type.includes('presentation');
    }

    isAudio(): boolean {
        const types = ['mp3', 'wav', 'ogg', 'm4a'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return types.includes(type) || type.startsWith('audio/');
    }

    isVideo(): boolean {
        const types = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return types.includes(type) || type.startsWith('video/');
    }

    private getDocId(): string | null {
        if (!this.file) return null;
        return (this.file as any).documentId || (this.file as any).id || null;
    }

    getSpreadsheetFile(): any {
        const docId = this.getDocId();
        if (!docId) return null;
        return {
            documentId: docId,
            fileName: this.file?.fileName,
            fileType: this.file?.fileType,
            fileSize: this.file?.fileSize
        };
    }

    getFileIcon(): string {
        const type = this.file?.fileType?.toLowerCase() || '';
        if (this.file?.isFolder) return '📁';
        if (this.isPDF()) return '📄';
        if (this.isDocx()) return '📝';
        if (this.isExcel()) return '📊';
        if (this.isPpt()) return '📽️';
        if (this.isAudio()) return '🎵';
        if (this.isVideo()) return '🎬';
        if (type === 'txt') return '📃';
        if (this.isImage()) return '🖼️';
        return '📁';
    }

    getFileIconClass(): string {
        if (this.isPDF()) return 'file-icon-pdf';
        if (this.isDocx()) return 'file-icon-docx';
        if (this.isExcel()) return 'file-icon-xlsx';
        if (this.isText()) return 'file-icon-txt';
        if (this.file?.isFolder) return 'file-icon-folder';
        return '';
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString?: string): string {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    onClose() {
        this.close.emit();
    }

    onDownload() {
        if (this.file) {
            this.download.emit(this.file);
        }
    }

    onStar() {
        if (this.file) {
            this.star.emit(this.file);
        }
    }
}
