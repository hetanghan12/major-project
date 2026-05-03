/**
 * Document Service - SECURE VERSION
 * ===================================
 * Handles document upload, listing, download, and deletion.
 * 
 * ============================================================================
 * SECURITY: MULTI-TENANT ISOLATION
 * ============================================================================
 * 
 * This service uses SECURE backend endpoints that enforce:
 * 1. Firebase token authentication (via authInterceptor)
 * 2. User isolation (userId from verified token only)
 * 3. Ownership verification on all operations
 * 
 * ❌ FORBIDDEN: Frontend filtering (all filtering done server-side)
 * ❌ FORBIDDEN: Sending userId in request body
 * ✅ REQUIRED: Authentication token in every request
 * 
 * @author College Project - Security Fixed
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, tap, map, catchError, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardService } from './dashboard.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

// Document interface with Google Drive-like features
export interface Document {
    documentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    publicUrl: string;
    storageUrl?: string; // NEW: From uploads schema
    vectorCount: number;
    status: 'uploading' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'ready';
    uploadedAt: string;
    createdAt?: any;     // NEW: From uploads schema
    uploadId?: string;   // NEW: From uploads schema
    error?: string;

    // Google Drive-like features
    isStarred: boolean;
    isTrashed: boolean;
    isFolder: boolean;
    parentFolderId: string | null;
    modifiedAt?: string;
    sharedWith?: string[];

    // Thumbnail (Google Drive-style preview stored in S3)
    thumbnailUrl?: string;    // Legacy local thumbnail
    thumbnailStatus?: 'processing' | 'ready' | 'failed'; // Status indicator
    previewUrl?: string;      // S3-stored preview URL
    previewPath?: string;     // S3 preview key
    previewGenerated?: boolean;

    // Collaboration & Content (NEW)
    content?: string;
    lastEditedBy?: string;
    updatedAt?: string;
    userId?: string;         // Firebase UID of the uploader
    ownerUserId?: string;    // Firebase UID of the owner
}

// Upload progress interface
export interface UploadProgress {
    uploadId?: string;
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error' | 'cancelled';
    fileName?: string;
    error?: string;
    isCancelled?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    /**
     * SECURITY: Use the secure API endpoints
     * These endpoints require authentication and enforce user isolation
     */
    private apiUrl = environment.apiUrl;

    // SECURITY: Use /api/secure/documents instead of /api/documents
    private secureDocumentsUrl = `${this.apiUrl}/secure/documents`;

    private _documents = signal<Document[]>([]);
    private _realtimeDoc = signal<Document | null>(null); // Live state of active document
    private _isLoading = signal<boolean>(false);
    private _uploadProgress = signal<UploadProgress | null>(null);

    // Polling state for background processing
    private isPolling = false;
    private pollTimeout: any = null;

    // Public computed values
    readonly documents = computed(() => this._documents());
    readonly realtimeDoc = computed(() => this._realtimeDoc());
    readonly isLoading = computed(() => this._isLoading());
    readonly uploadProgress = computed(() => this._uploadProgress());

    private dashboardService = inject(DashboardService);
    private notificationService = inject(NotificationService);
    private authService = inject(AuthService);
    private http = inject(HttpClient);

    // Track active upload subjects for cancellation
    private cancelSubjects: Map<string, Subject<void>> = new Map();
    // Track AbortControllers for explicit request termination
    private abortControllers: Map<string, AbortController> = new Map();

    constructor() { }

    /**
     * Load user's documents from secure endpoint
     * 
     * SECURITY:
     * - Requires valid Firebase token (added by authInterceptor)
     * - Server returns ONLY documents belonging to the authenticated user
     * - No frontend filtering needed or allowed
     */
    async loadDocuments(): Promise<void> {
        this._isLoading.set(true);

        try {
            // STEP 1: Fetch global config (for file type/size validation)
            // Await this to ensure it's available before users try to upload
            await this.getSystemConfig();

            // STEP 2: Fetch documents
            const response = await this.http.get<{ success: boolean; documents: Document[] }>(
                this.secureDocumentsUrl
            ).toPromise();

            if (response?.success) {
                this._documents.set(response.documents);
                this.checkAndStartPolling(response.documents);
            }
        } catch (error: any) {
            console.error('Failed to load documents:', error);
            if (error.status === 401) {
                console.error('SECURITY: Authentication required. Please log in.');
            }
        } finally {
            this._isLoading.set(false);
        }
    }

    private _systemConfig = signal<{ allowedFileTypes: string[], maxFileSizeMB: number } | null>(null);
    readonly systemConfig = computed(() => this._systemConfig());

    /**
     * Fetch public system configuration (allowed file types, max size, etc.)
     */
    async getSystemConfig(): Promise<any> {
        try {
            const res = await this.http.get<any>(`${this.secureDocumentsUrl}/config`).toPromise();
            if (res?.success) {
                this._systemConfig.set(res.config);
            }
            return res;
        } catch (error) {
            console.error('Failed to fetch system config:', error);
            return null;
        }
    }

    /**
     * Unified Dashboard Data Fetch (ONLY for summary display)
     */
    async getUserDashboardData(): Promise<any> {
        try {
            return await this.http.get<any>(`${this.secureDocumentsUrl}/dashboard`).toPromise();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            return { success: false, stats: {}, recentDocuments: [] };
        }
    }

    /**
     * SMART POLLING: Automatically refreshes docs if any are in 'processing' state.
     * This replaces direct Firestore subscriptions to avoid 'Permission Denied' errors
     * when security rules are strictly locked to Admin SDK only.
     */
    private checkAndStartPolling(docs: Document[]): void {
        const hasProcessing = docs.some(d =>
            d.thumbnailStatus === 'processing' || d.status === 'processing' || d.status === 'uploading'
        );

        if (hasProcessing) {
            if (!this.isPolling) {
                console.log('🔄 [DocumentService] Processing docs detected, starting background poll...');
                this.startPollingChain();
            }
        } else if (this.isPolling) {
            console.log('✅ [DocumentService] All docs processed, stopping poll.');
            this.stopPollingChain();
        }
    }

    private startPollingChain(): void {
        this.isPolling = true;

        // Clear any existing timeout
        if (this.pollTimeout) clearTimeout(this.pollTimeout);

        // Schedule next poll in 5 seconds
        this.pollTimeout = setTimeout(async () => {
            // Safety check: has polling been stopped since we scheduled?
            if (!this.isPolling) return;

            console.log('📡 [DocumentService] Polling for status updates...');

            try {
                // SECURITY: Refresh documents via SECURE backend (Always has permission)
                // This also calls checkAndStartPolling again upon completion,
                // but we need to ensure the chain CONTINUES even if the call fails
                await this.loadDocuments();
            } catch (err) {
                console.error('📡 [Polling Chain] Load failed, will retry in 5s...', err);
            }

            // RECURSIVE RE-START:
            // Only restart if we are still supposed to be polling
            if (this.isPolling) {
                this.startPollingChain();
            }
        }, 5000);
    }

    private stopPollingChain(): void {
        this.isPolling = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
    }

    // Cleanup methods replaced by polling logic above
    subscribeToDocument(documentId: string): void { }
    unsubscribeFromDocument(documentId: string): void { }

    /**
     * Cleanup all background processes (e.g. on logout)
     */
    cleanupSubscriptions(): void {
        this.stopPollingChain();
        this._realtimeDoc.set(null);
        console.log('🧹 [DocumentService] Background polling and state cleared');
    }

    /**
     * Save direct text content updates to a document
     * (Requires owner or 'edit' permission)
     */
    async saveDocumentContent(documentId: string, content: string): Promise<any> {
        try {
            return await this.http.post<any>(`${this.secureDocumentsUrl}/${documentId}/save`, { content }).toPromise();
        } catch (error) {
            console.error('Failed to save document content:', error);
            throw error;
        }
    }

    /**
     * Upload a document to secure endpoint
     * 
     * SECURITY:
     * - Requires valid Firebase token (added by authInterceptor)
     * - Server extracts userId from token (NOT from request body)
     * - File is stored in user-isolated directory
     * - Vectors are stored in user-isolated Pinecone namespace
     * 
     * ❌ DO NOT send userId in the request - server derives it from token
     */
    uploadDocument(file: File, parentFolderId: string | null = null, externalSignal?: AbortSignal, providedUploadId?: string): Observable<Document | null> {
        const documentId = providedUploadId || (
            (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
            ? crypto.randomUUID() 
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        );
        const uploadId = documentId;

        const cancelSubject = new Subject<void>();
        this.cancelSubjects.set(uploadId, cancelSubject);

        // Explicit AbortController for the HTTP request (fallback to internal if no external signal provided)
        const abortController = new AbortController();
        this.abortControllers.set(uploadId, abortController);

        const signal = externalSignal || abortController.signal;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentId', documentId);
        formData.append('parentFolderId', parentFolderId || '');

        this._uploadProgress.set({
            uploadId,
            progress: 0,
            status: 'uploading',
            fileName: file.name
        });

        // SECURITY: POST /api/secure/documents/upload
        return this.http.post<{ success: boolean; document: Document }>(
            `${this.secureDocumentsUrl}/upload`,
            formData,
            {
                reportProgress: true,
                observe: 'events',
                // @ts-ignore - Some Angular versions might not have 'signal' in types but it's supported in underlying fetch/xhr
                signal: signal
            } as any
        ).pipe(
            takeUntil(cancelSubject),
            tap((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this._uploadProgress.set({
                        uploadId,
                        progress: progress < 100 ? progress : 90,
                        status: progress < 100 ? 'uploading' : 'processing',
                        fileName: file.name
                    });
                }
            }),
            map((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.Response) {
                    this._uploadProgress.set({
                        progress: 100,
                        status: 'complete',
                        fileName: file.name
                    });

                    // Update UI immediately (optimistic/confirmed)
                    // Ensure we handle the response structure correctly
                    const responseBody = event.body;
                    if (responseBody && responseBody.success && responseBody.document) {
                        const newDoc = responseBody.document;
                        console.log('[DocumentService] Upload success, adding doc:', newDoc);

                        this.cancelSubjects.delete(uploadId);
                        this.abortControllers.delete(uploadId);

                        // Update UI immediately (optimistic/confirmed)
                        // SECURITY: Use update with deduplication to prevent double-entry if polling overlapped
                        this._documents.update(docs => {
                            const filteredDocs = docs.filter(d => d.documentId !== newDoc.documentId);
                            return [newDoc, ...filteredDocs];
                        });

                        // Ensure polling is active to catch the thumbnail completion
                        this.checkAndStartPolling(this._documents());

                        // Refresh dashboard stats (storage bar, etc)
                        this.dashboardService.refreshDashboard();

                        // Reload notifications to show the new upload alert
                        this.notificationService.loadNotifications().subscribe();

                        // Reset session timeout on activity
                        this.authService.resetInactivityTimer();

                        return newDoc;
                    }
                }
                return null;
            }),
            catchError((error: any) => {
                let errorMessage = 'Upload failed. Please try again.';

                if (error.status === 401) {
                    errorMessage = 'Authentication required. Please log in.';
                } else if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.status === 0) {
                    errorMessage = 'Cannot connect to server. Is the backend running?';
                } else if (error.status === 413) {
                    errorMessage = 'File too large. Maximum size is 50MB.';
                }

                this._uploadProgress.set({
                    uploadId,
                    progress: 0,
                    status: 'error',
                    fileName: file.name,
                    error: errorMessage
                });

                this.cancelSubjects.delete(uploadId);
                this.abortControllers.delete(uploadId);

                throw new Error(errorMessage);
            })
        );
    }

    /**
     * Create a new folder
     */
    createFolder(name: string, parentFolderId: string | null = null): Observable<any> {
        return this.http.post(`${this.secureDocumentsUrl}/folder`, { name, parentFolderId }).pipe(
            tap((response: any) => {
                if (response.success && response.document) {
                    this._documents.update(docs => [response.document, ...docs]);
                    // Refresh dashboard stats
                    this.dashboardService.refreshDashboard();
                }
            })
        );
    }

    /**
     * Toggle star status
     */
    toggleStar(documentId: string, isStarred: boolean): Observable<any> {
        // Optimistic update
        this._documents.update(docs =>
            docs.map(d => d.documentId === documentId ? { ...d, isStarred } : d)
        );

        return this.http.patch(`${this.secureDocumentsUrl}/${documentId}`, { isStarred });
    }

    /**
     * Update trash status
     */
    updateTrashStatus(documentId: string, isTrashed: boolean): Observable<any> {
        // Optimistic update
        this._documents.update(docs =>
            docs.map(d => d.documentId === documentId ? { ...d, isTrashed } : d)
        );

        return this.http.patch(`${this.secureDocumentsUrl}/${documentId}`, { isTrashed });
    }

    /**
     * Rename document
     */
    renameDocument(documentId: string, fileName: string): Observable<any> {
        // Optimistic update
        this._documents.update(docs =>
            docs.map(d => d.documentId === documentId ? { ...d, fileName } : d)
        );

        return this.http.patch(`${this.secureDocumentsUrl}/${documentId}`, { fileName });
    }

    /**
     * Move document to a folder
     */
    moveDocument(documentId: string, parentFolderId: string | null): Observable<any> {
        // Optimistic update
        this._documents.update(docs =>
            docs.map(d => d.documentId === documentId ? { ...d, parentFolderId } : d)
        );

        return this.http.patch(`${this.secureDocumentsUrl}/${documentId}`, { parentFolderId });
    }

    /**
     * Make a copy of a document
     */
    copyDocument(documentId: string, targetFolderId: string | null = null): Observable<any> {
        return this.http.post(`${this.secureDocumentsUrl}/${documentId}/copy`, { targetFolderId }).pipe(
            tap(() => {
                // Refresh list after copy because it's a completely new file
                this.loadDocuments();
            })
        );
    }

    /**
     * Download a document (secure)
     * 
     * SECURITY:
     * - Requires valid Firebase token
     * - Server verifies ownership before serving file
     */
    async downloadDocument(documentId: string, fileName: string): Promise<void> {
        try {
            // SECURITY: GET /api/secure/documents/:id/download
            // Request signed URL to bypass CORS and memory issues
            const response = await this.http.get<{ success: boolean, downloadUrl: string }>(
                `${this.secureDocumentsUrl}/${documentId}/download?json=true`
            ).toPromise();

            if (response && response.success && response.downloadUrl) {
                // Create a temporary link to trigger download
                const a = document.createElement('a');
                a.href = response.downloadUrl;
                a.download = fileName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (error: any) {
            console.error('Failed to download document:', error);

            if (error.status === 401) {
                throw new Error('Authentication required. Please log in.');
            } else if (error.status === 403) {
                throw new Error('Access denied. You do not own this document.');
            }
            throw error;
        }
    }

    /**
     * Bulk delete documents (SECURE)
     * 
     * SECURITY:
     * - Frontend sends array of fileIds
     * - Backend verifies ownership for EACH file
     * - Returns successful and failed IDs
     */
    async bulkDelete(fileIds: string[]): Promise<any> {
        try {
            // SECURITY: POST /api/secure/documents/bulk-delete
            const response = await this.http.post<any>(
                `${this.secureDocumentsUrl}/bulk-delete`,
                { fileIds }
            ).toPromise();

            if (response && response.success) {
                // Remove successfully deleted files from local state
                const successfulIds = response.results.success || [];
                if (successfulIds.length > 0) {
                    const currentDocs = this._documents();
                    this._documents.set(currentDocs.filter(d => !successfulIds.includes(d.documentId)));
                }

                // Refresh dashboard stats
                this.dashboardService.refreshDashboard();

                return response;
            }
            throw new Error(response?.message || 'Bulk delete failed');
        } catch (error: any) {
            console.error('Failed to perform bulk delete:', error);
            throw error;
        }
    }

    /**
     * Bulk move documents (SECURE)
     */
    async bulkMove(fileIds: string[], destinationFolderId: string | null): Promise<any> {
        try {
            const response = await this.http.post<any>(
                `${this.secureDocumentsUrl}/bulk-move`,
                { fileIds, destinationFolderId }
            ).toPromise();

            if (response && response.success) {
                // Optimistic update local state for successful moves
                const successfulIds = response.results.success || [];
                if (successfulIds.length > 0) {
                    this._documents.update(docs =>
                        docs.map(d => successfulIds.includes(d.documentId)
                            ? { ...d, parentFolderId: destinationFolderId }
                            : d)
                    );
                }

                // Refresh dashboard stats
                this.dashboardService.refreshDashboard();

                return response;
            }
            throw new Error(response?.message || 'Bulk move failed');
        } catch (error: any) {
            console.error('Failed to perform bulk move:', error);
            throw error;
        }
    }

    /**
     * Bulk copy documents (SECURE)
     */
    async bulkCopy(fileIds: string[], destinationFolderId: string | null): Promise<any> {
        try {
            const response = await this.http.post<any>(
                `${this.secureDocumentsUrl}/bulk-copy`,
                { fileIds, destinationFolderId }
            ).toPromise();

            if (response && response.success) {
                // Refresh dashboard stats
                this.dashboardService.refreshDashboard();
                return response;
            }
            throw new Error(response?.message || 'Bulk copy failed');
        } catch (error: any) {
            console.error('Failed to perform bulk copy:', error);
            throw error;
        }
    }

    /**
     * Bulk update trash status (SOFT DELETE)
     */
    async bulkUpdateTrashStatus(fileIds: string[], isTrashed: boolean): Promise<any> {
        try {
            const response = await this.http.post<any>(
                `${this.secureDocumentsUrl}/bulk-update-trash`,
                { fileIds, isTrashed }
            ).toPromise();

            if (response && response.success) {
                // Refresh dashboard stats
                this.dashboardService.refreshDashboard();
                return response;
            }
            throw new Error(response?.message || 'Bulk trash update failed');
        } catch (error: any) {
            console.error('Failed to bulk update trash status:', error);
            throw error;
        }
    }

    /**
     * Delete a document (secure)
     * 
     * SECURITY:
     * - Requires valid Firebase token
     * - Server verifies ownership before deletion
     * - Returns 403 if user doesn't own the document
     */
    async deleteDocument(documentId: string): Promise<void> {
        try {
            // SECURITY: DELETE /api/secure/documents/:id
            // Server verifies ownership before deletion
            await this.http.delete(
                `${this.secureDocumentsUrl}/${documentId}`
            ).toPromise();

            // Remove from local state
            const currentDocs = this._documents();
            this._documents.set(currentDocs.filter(d => d.documentId !== documentId));

            // Refresh dashboard stats (storage bar, etc)
            this.dashboardService.refreshDashboard();

        } catch (error: any) {
            console.error('Failed to delete document:', error);

            if (error.status === 401) {
                throw new Error('Authentication required. Please log in.');
            } else if (error.status === 403) {
                throw new Error('Access denied. You do not own this document.');
            }
            throw error;
        }
    }

    /**
     * Retry/Trigger thumbnail generation
     */
    async retryThumbnail(documentId: string): Promise<any> {
        try {
            return await this.http.post<any>(`${this.secureDocumentsUrl}/${documentId}/retry-thumbnail`, {}).toPromise();
        } catch (error) {
            console.error('Failed to retry thumbnail:', error);
            throw error;
        }
    }

    cancelUpload(uploadId: string): void {
        console.log(`[DocumentService] Cancelling upload: ${uploadId}`);

        // 1. Notify Backend (Wait for cleanup)
        // Standardized cancellation route: POST /api/secure/documents/:id/cancel
        this.http.post(`${this.secureDocumentsUrl}/${uploadId}/cancel`, {}).subscribe({
            next: () => console.log(`[DocumentService] Backend notified for cancel: ${uploadId}`),
            error: (err) => console.error(`[DocumentService] Failed to notify backend for cancel:`, err)
        });

        // 2. Clear state
        this._uploadProgress.set({
            uploadId,
            progress: 0,
            status: 'cancelled',
            isCancelled: true
        });

        // 3. Clear subject to stop observable
        const subject = this.cancelSubjects.get(uploadId);
        if (subject) {
            subject.next();
            subject.complete();
            this.cancelSubjects.delete(uploadId);
        }

        // 4. Abort the HTTP request explicitly
        const controller = this.abortControllers.get(uploadId);
        if (controller) {
            console.log(`[DocumentService] Explicitly aborting HTTP request for ${uploadId}`);
            controller.abort();
            this.abortControllers.delete(uploadId);
        }

        // 4. Reload documents to ensure UI is clean
        setTimeout(() => this.loadDocuments(), 1000);
    }

    /**
     * Clear upload progress
     */
    clearUploadProgress(): void {
        this._uploadProgress.set(null);
        this.cancelSubjects.forEach(s => {
            s.next();
            s.complete();
        });
        this.cancelSubjects.clear();
    }

    /**
     * Set upload error
     */
    setUploadError(error: string): void {
        this._uploadProgress.set({
            progress: 0,
            status: 'error',
            error
        });
    }

    /**
     * Get file icon based on type
     */
    getFileIcon(fileType: string): string {
        switch (fileType.toLowerCase()) {
            case 'pdf':
                return '📄';
            case 'docx':
            case 'doc':
                return '📝';
            case 'txt':
                return '📃';
            case 'jpeg':
            case 'jpg':
            case 'png':
                return '🖼️';
            default:
                return '📁';
        }
    }

    /**
     * Get fully resolved thumbnail URL
     */
    getThumbnailUrl(url: string | undefined): string {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${this.apiUrl.replace('/api', '')}${url}`;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes: number): string {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return '--';
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

