/**
 * STORAGE SERVICE - Frontend
 * ============================
 * Real-time storage tracking for CloudAI Smart Storage.
 * 
 * Connects to backend to get REAL storage statistics 
 * (calculated from actual files, not fake/cached values).
 * 
 * @author CloudAI Frontend
 * @version 1.0.0
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Storage statistics interface
export interface StorageStats {
    storageUsedBytes: number;
    storageLimitBytes: number;
    storageUsedFormatted: string;
    storageLimitFormatted: string;
    percentUsed: number;
    fileCount: number;
    isNearLimit: boolean;
    isAtLimit: boolean;
    availableBytes: number;
    availableFormatted: string;
}

// Storage breakdown interface
export interface StorageBreakdown {
    pdf: { count: number; bytes: number; formatted: string };
    docx: { count: number; bytes: number; formatted: string };
    doc: { count: number; bytes: number; formatted: string };
    txt: { count: number; bytes: number; formatted: string };
    images: { count: number; bytes: number; formatted: string };
    other: { count: number; bytes: number; formatted: string };
}

// Upload progress interface
export interface UploadProgress {
    uploadId: string;
    fileName: string;
    totalBytes: number;
    uploadedBytes: number;
    percent: number;
    status: 'pending' | 'receiving' | 'uploading' | 'processing' | 'complete' | 'error';
    stage: string;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private apiUrl = environment.apiUrl;

    // Storage signals
    private _storageStats = signal<StorageStats | null>(null);
    private _isLoading = signal<boolean>(false);
    private _lastUpdated = signal<Date | null>(null);

    // Active uploads
    private _activeUploads = signal<UploadProgress[]>([]);

    // SSE connections
    private sseConnections = new Map<string, EventSource>();

    // Public computed values
    readonly storageStats = computed(() => this._storageStats());
    readonly isLoading = computed(() => this._isLoading());
    readonly lastUpdated = computed(() => this._lastUpdated());
    readonly activeUploads = computed(() => this._activeUploads());

    // Convenience computed values
    readonly usedStorage = computed(() => {
        const stats = this._storageStats();
        return stats?.storageUsedFormatted || '0 B';
    });

    readonly totalStorage = computed(() => {
        const stats = this._storageStats();
        return stats?.storageLimitFormatted || '5 GB';
    });

    readonly storagePercent = computed(() => {
        const stats = this._storageStats();
        return stats?.percentUsed || 0;
    });

    readonly availableStorage = computed(() => {
        const stats = this._storageStats();
        return stats?.availableFormatted || '5 GB';
    });

    readonly isNearLimit = computed(() => {
        const stats = this._storageStats();
        return stats?.isNearLimit || false;
    });

    readonly isAtLimit = computed(() => {
        const stats = this._storageStats();
        return stats?.isAtLimit || false;
    });

    constructor(private http: HttpClient) { }

    /**
     * Load storage statistics from backend
     * This calculates REAL storage from the database
     */
    async loadStorageStats(): Promise<StorageStats | null> {
        this._isLoading.set(true);

        try {
            const response = await this.http.get<{ success: boolean; storage: StorageStats }>(
                `${this.apiUrl}/storage/stats`
            ).toPromise();

            if (response?.success && response.storage) {
                this._storageStats.set(response.storage);
                this._lastUpdated.set(new Date());
                console.log('📊 Storage stats loaded:', response.storage.storageUsedFormatted);
                return response.storage;
            }

            return null;
        } catch (error) {
            console.error('Failed to load storage stats:', error);
            return null;
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Get storage breakdown by file type
     */
    async getStorageBreakdown(): Promise<StorageBreakdown | null> {
        try {
            const response = await this.http.get<{ success: boolean; breakdown: StorageBreakdown }>(
                `${this.apiUrl}/storage/breakdown`
            ).toPromise();

            return response?.breakdown || null;
        } catch (error) {
            console.error('Failed to get storage breakdown:', error);
            return null;
        }
    }

    /**
     * Check if user can upload a file of given size
     */
    async checkQuota(fileSizeBytes: number): Promise<{ canUpload: boolean; message: string }> {
        try {
            const response = await this.http.get<{
                success: boolean;
                canUpload: boolean;
                message: string
            }>(
                `${this.apiUrl}/storage/quota/check?size=${fileSizeBytes}`
            ).toPromise();

            return {
                canUpload: response?.canUpload || false,
                message: response?.message || 'Unknown error'
            };
        } catch (error) {
            console.error('Failed to check quota:', error);
            return {
                canUpload: false,
                message: 'Failed to check storage quota'
            };
        }
    }

    /**
     * Initialize user storage (call on login)
     */
    async initializeStorage(): Promise<void> {
        try {
            await this.http.post(
                `${this.apiUrl}/storage/initialize`,
                {}
            ).toPromise();

            // Load stats after initialization
            await this.loadStorageStats();
        } catch (error) {
            console.error('Failed to initialize storage:', error);
        }
    }

    /**
     * Subscribe to upload progress via SSE
     */
    subscribeToUploadProgress(
        uploadId: string,
        onProgress: (progress: UploadProgress) => void,
        onComplete: () => void,
        onError: (error: string) => void
    ): () => void {
        // Close existing connection if any
        this.unsubscribeFromUploadProgress(uploadId);

        const token = localStorage.getItem('auth_token');
        const url = `${this.apiUrl}/upload/progress/${uploadId}`;

        // Note: For SSE with auth, we might need to use a different approach
        // This is a simplified version - in production, use a token in query params
        // or implement a WebSocket solution

        const eventSource = new EventSource(url);
        this.sseConnections.set(uploadId, eventSource);

        eventSource.addEventListener('progress', (event: MessageEvent) => {
            const progress: UploadProgress = JSON.parse(event.data);

            // Update active uploads
            this.updateActiveUpload(progress);

            // Call callback
            onProgress(progress);

            // Check for completion
            if (progress.status === 'complete') {
                onComplete();
                this.unsubscribeFromUploadProgress(uploadId);
                // Refresh storage stats
                this.loadStorageStats();
            } else if (progress.status === 'error') {
                onError(progress.error || 'Upload failed');
                this.unsubscribeFromUploadProgress(uploadId);
            }
        });

        eventSource.onerror = () => {
            onError('Connection lost');
            this.unsubscribeFromUploadProgress(uploadId);
        };

        // Return unsubscribe function
        return () => this.unsubscribeFromUploadProgress(uploadId);
    }

    /**
     * Unsubscribe from upload progress
     */
    unsubscribeFromUploadProgress(uploadId: string): void {
        const eventSource = this.sseConnections.get(uploadId);
        if (eventSource) {
            eventSource.close();
            this.sseConnections.delete(uploadId);
        }
    }

    /**
     * Update active upload in the list
     */
    private updateActiveUpload(progress: UploadProgress): void {
        const uploads = [...this._activeUploads()];
        const index = uploads.findIndex(u => u.uploadId === progress.uploadId);

        if (index >= 0) {
            if (progress.status === 'complete' || progress.status === 'error') {
                uploads.splice(index, 1);
            } else {
                uploads[index] = progress;
            }
        } else if (progress.status !== 'complete' && progress.status !== 'error') {
            uploads.push(progress);
        }

        this._activeUploads.set(uploads);
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cleanup on logout
     */
    cleanup(): void {
        // Close all SSE connections
        this.sseConnections.forEach((es, id) => {
            es.close();
        });
        this.sseConnections.clear();

        // Reset state
        this._storageStats.set(null);
        this._activeUploads.set([]);
    }
}
