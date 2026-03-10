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

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Document interface with Google Drive-like features
export interface Document {
    documentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storagePath: string;
    publicUrl: string;
    vectorCount: number;
    status: 'processing' | 'ready' | 'failed';
    uploadedAt: string;
    error?: string;

    // Google Drive-like features
    isStarred?: boolean;
    isTrashed?: boolean;
    isFolder?: boolean;
    parentFolderId?: string | null;
    modifiedAt?: string;
    sharedWith?: string[];

    // Thumbnail (Google Drive-style preview stored in S3)
    thumbnailUrl?: string;    // Legacy local thumbnail
    thumbnailStatus?: 'processing' | 'ready' | 'failed'; // Status indicator
    previewUrl?: string;      // S3-stored preview URL
    previewPath?: string;     // S3 preview key
    previewGenerated?: boolean;
}

// Upload progress interface
export interface UploadProgress {
    progress: number;
    status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
    fileName?: string;
    error?: string;
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
    private _isLoading = signal<boolean>(false);
    private _uploadProgress = signal<UploadProgress | null>(null);

    // Public computed values
    readonly documents = computed(() => this._documents());
    readonly isLoading = computed(() => this._isLoading());
    readonly uploadProgress = computed(() => this._uploadProgress());

    constructor(private http: HttpClient) { }

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
            // SECURITY: GET /api/secure/documents
            // The authInterceptor automatically adds the Firebase token
            // Server filters documents by userId from verified token
            const response = await this.http.get<{ success: boolean; documents: Document[] }>(
                this.secureDocumentsUrl
            ).toPromise();

            if (response?.success) {
                this._documents.set(response.documents);
            }
        } catch (error: any) {
            console.error('Failed to load documents:', error);

            // Handle authentication errors
            if (error.status === 401) {
                console.error('SECURITY: Authentication required. Please log in.');
            }
        } finally {
            this._isLoading.set(false);
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
    uploadDocument(file: File, parentFolderId: string | null = null): Observable<Document | null> {
        const formData = new FormData();
        formData.append('file', file);
        // Explicitly append parentFolderId (use empty string for root)
        formData.append('parentFolderId', parentFolderId || '');


        // SECURITY: Do NOT include userId in formData
        // The server extracts it from the verified Firebase token

        this._uploadProgress.set({
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
                observe: 'events'
            }
        ).pipe(
            tap((event: HttpEvent<any>) => {
                if (event.type === HttpEventType.UploadProgress && event.total) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    this._uploadProgress.set({
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

                        this._documents.update(docs => [newDoc, ...docs]);

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
                    progress: 0,
                    status: 'error',
                    fileName: file.name,
                    error: errorMessage
                });

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
     * Clear upload progress
     */
    clearUploadProgress(): void {
        this._uploadProgress.set(null);
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

