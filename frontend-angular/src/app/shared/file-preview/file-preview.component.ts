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
import { CloudFile } from '../../core/models/file.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SpreadsheetViewerComponent } from '../spreadsheet-viewer/spreadsheet-viewer.component';

@Component({
    selector: 'app-file-preview',
    standalone: true,
    imports: [CommonModule, SpreadsheetViewerComponent],
    template: `
        <div class="preview-overlay" (click)="onClose()">
            <div class="preview-container" (click)="$event.stopPropagation()">
                <!-- Header -->
                <div class="preview-header">
                    <div class="preview-title">
                        <span [class]="getFileIconClass()">{{ getFileIcon() }}</span>
                        <span>{{ file?.fileName }}</span>
                    </div>
                    <div class="preview-actions">
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
                            <pre *ngIf="textContent">{{ textContent }}</pre>
                            <div *ngIf="!textContent" class="text-preview-loading">
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

                    <!-- Unsupported Format -->
                    <ng-container *ngIf="!isLoading && !loadError && !isPDF() && !isImage() && !isText() && !isDocx() && !isExcel()">
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

    // State
    isLoading: boolean = true;
    loadError: string = '';
    showDetails: boolean = false;
    docxLoading: boolean = false;
    docxError: string = '';
    excelLoading: boolean = false;
    excelError: string = '';

    private apiUrl = environment.apiUrl;

    constructor(
        private sanitizer: DomSanitizer,
        private authService: AuthService
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
        } else {
            this.isLoading = false;
        }
    }

    private async loadPdfPreviewWithAuth() {
        try {
            const docId = (this.file as any)?.documentId;
            if (!docId) throw new Error('Document ID not found');

            const token = await this.getAuthToken();

            // 1. Fetch document metadata first to get fresh signed URL
            const metaResponse = await fetch(`${this.apiUrl}/secure/documents/${docId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (metaResponse.ok) {
                const metaData = await metaResponse.json();
                if (metaData.success && metaData.document?.signedUrl) {
                    console.log('[FilePreview] Using direct S3 signed URL');
                    // Use signed URL directly - no auth headers needed for S3
                    this.directPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(metaData.document.signedUrl);
                    this.isLoading = false;
                    return;
                }
            }

            // 2. Fallback: Fetch via proxy if no signed URL (legacy files)
            console.log('[FilePreview] Falling back to proxy fetch');
            const previewUrl = `${this.apiUrl}/secure/documents/${docId}/view`;
            const response = await fetch(previewUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const blob = await response.blob();
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
            const docId = (this.file as any)?.documentId;
            if (!docId) throw new Error('Document ID not found');

            const token = await this.getAuthToken();

            // 1. Fetch document metadata first to get fresh signed URL
            const metaResponse = await fetch(`${this.apiUrl}/secure/documents/${docId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (metaResponse.ok) {
                const metaData = await metaResponse.json();
                if (metaData.success && metaData.document?.signedUrl) {
                    console.log('[FilePreview] Using direct S3 signed URL for image');
                    // Use signed URL directly - best performance
                    this.imageUrl = metaData.document.signedUrl;
                    this.isLoading = false;
                    return;
                }
            }

            // 2. Fallback to blob fetch (legacy)
            console.log('[FilePreview] Falling back to proxy fetch for image');
            const response = await fetch(
                `${this.apiUrl}/secure/documents/${docId}/view`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to load image: ${response.statusText}`);
            }

            const blob = await response.blob();
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
            const docId = (this.file as any)?.documentId;
            if (!docId) throw new Error('Document ID not found');

            const token = await this.getAuthToken();

            // 1. Fetch document metadata first to get fresh signed URL
            let downloadUrl = `${this.apiUrl}/secure/documents/${docId}/view`;
            let fetchHeaders: any = { 'Authorization': `Bearer ${token}` };

            try {
                const metaResponse = await fetch(`${this.apiUrl}/secure/documents/${docId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (metaResponse.ok) {
                    const metaData = await metaResponse.json();
                    if (metaData.success && metaData.document?.signedUrl) {
                        console.log('[FilePreview] Using direct S3 signed URL for text');
                        downloadUrl = metaData.document.signedUrl;
                        fetchHeaders = {}; // No auth headers for S3
                    }
                }
            } catch (e) {
                console.warn('[FilePreview] Failed to fetch metadata, falling back to proxy');
            }

            // 2. Fetch Text content
            const response = await fetch(downloadUrl, { headers: fetchHeaders });

            if (!response.ok) {
                // Try to read error message
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(errorText || response.statusText);
            }

            this.textContent = await response.text();
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
            if (!docId) {
                throw new Error('Document ID not found');
            }

            console.log('[FilePreview] Loading DOCX preview for:', docId);

            const token = await this.getAuthToken();

            // Fetch HTML preview from backend
            const response = await fetch(
                `${this.apiUrl}/secure/documents/${docId}/preview`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                let errorMsg = response.statusText;
                try {
                    const errorBody = await response.json();
                    errorMsg = errorBody.message || response.statusText;
                } catch (e) { }
                throw new Error(`Failed to load preview: ${errorMsg}`);
            }

            // Get HTML content and create blob URL
            const htmlContent = await response.text();
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
            console.log('[FilePreview] Loading Excel preview for:', docId);

            if (!docId) {
                throw new Error('No document ID available');
            }

            // First, try to use the generated thumbnail/preview from S3
            const previewUrl = (this.file as any)?.previewUrl || (this.file as any)?.thumbnailUrl;

            if (previewUrl) {
                console.log('[FilePreview] Using generated preview:', previewUrl);
                this.excelPreviewUrl = previewUrl;
                this.excelLoading = false;
                return;
            }

            // Fallback: Try to get thumbnail from local storage
            const localThumbUrl = `${this.apiUrl}/api/thumbnails/${docId}.png`;
            console.log('[FilePreview] Trying local thumbnail:', localThumbUrl);

            // Test if thumbnail exists
            const token = await this.getAuthToken();
            const response = await fetch(localThumbUrl, {
                method: 'HEAD',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                this.excelPreviewUrl = localThumbUrl;
                this.excelLoading = false;
            } else {
                // No preview available
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
        const textTypes = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'ts', 'py', 'log'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return textTypes.includes(type) || type.startsWith('text/');
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
        const excelTypes = ['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'];
        const type = this.file?.fileType?.toLowerCase() || '';
        return excelTypes.includes(type) ||
            type.includes('spreadsheet') ||
            type.includes('excel') ||
            type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            type === 'application/vnd.ms-excel';
    }

    getSpreadsheetFile(): any {
        if (!this.file) return null;
        return {
            documentId: (this.file as any).documentId || (this.file as any).id,
            fileName: this.file.fileName,
            fileType: this.file.fileType,
            fileSize: this.file.fileSize
        };
    }

    getFileIcon(): string {
        const type = this.file?.fileType?.toLowerCase() || '';
        if (this.file?.isFolder) return '📁';
        if (this.isPDF()) return '📄';
        if (this.isDocx()) return '📝';
        if (this.isExcel()) return '📊';
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
