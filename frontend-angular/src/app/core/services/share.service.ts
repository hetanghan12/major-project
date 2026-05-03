/**
 * Share Service
 * ==============
 * Handles all file/folder sharing operations.
 * 
 * Features:
 * - Create shares (single or multi-recipient)
 * - List shared with me / shared by me
 * - Manage permissions
 * - Revoke access
 * 
 * @author CloudSpace
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// Share interfaces
export interface ShareRecipient {
    email: string;
    permission: 'view' | 'download';
}

export interface Share {
    shareId: string;
    resourceId: string;
    resourceType: 'file' | 'folder';
    ownerUserId: string;
    recipientEmail: string;
    recipientUserId: string | null;
    permission: 'view' | 'download';
    status: 'pending' | 'active' | 'revoked';
    message: string | null;
    sharedAt: string;
    revokedAt: string | null;
    expiresAt: string | null;
    lastAccessedAt: string | null;
}

export interface SharedWithMeFile extends Share {
    fileName: string;
    fileType: string;
    fileSize: number;
    thumbnailUrl: string | null;
    thumbnailStatus: string;
    isFolder: boolean;
    ownerName: string;
    ownerEmail: string | null;
}

export interface SharedByMeGroup {
    resourceId: string;
    resourceType: 'file' | 'folder';
    fileName: string;
    fileType: string | null;
    isFolder: boolean;
    recipients: SharedByMeRecipient[];
}

export interface SharedByMeRecipient {
    shareId: string;
    recipientEmail: string;
    permission: 'view' | 'download';
    status: 'pending' | 'active' | 'revoked';
    sharedAt: string;
    revokedAt: string | null;
}

export interface CreateShareRequest {
    resourceId: string;
    recipients: ShareRecipient[];
    message?: string;
}

export interface CreateShareResponse {
    success: boolean;
    shares: any[];
    summary: {
        created: number;
        active: number;
        pending: number;
        duplicates: number;
        failed: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ShareService {
    private readonly apiUrl = `${environment.apiUrl}/secure/shares`;

    // Signals for reactive state
    sharedWithMe = signal<SharedWithMeFile[]>([]);
    sharedByMe = signal<SharedByMeGroup[]>([]);
    isLoadingSharedWithMe = signal(false);
    isLoadingSharedByMe = signal(false);

    constructor(private http: HttpClient) { }

    /**
     * Create shares for a file/folder
     */
    createShares(data: CreateShareRequest): Observable<CreateShareResponse> {
        return this.http.post<CreateShareResponse>(this.apiUrl, data).pipe(
            tap(response => {
                if (response.success) {
                    console.log('[ShareService] Shares created:', response.summary);
                    // Refresh shared by me list
                    this.loadSharedByMe();
                }
            }),
            catchError(error => {
                console.error('[ShareService] Create shares failed:', error);
                throw error;
            })
        );
    }

    /**
     * Load files shared with the current user
     */
    loadSharedWithMe(): void {
        this.isLoadingSharedWithMe.set(true);
        this.http.get<{ success: boolean; shares: SharedWithMeFile[]; count: number }>(
            `${this.apiUrl}/with-me`
        ).pipe(
            tap(response => {
                if (response.success) {
                    this.sharedWithMe.set(response.shares);
                    console.log('[ShareService] Shared with me loaded:', response.count);
                }
            }),
            catchError(error => {
                console.error('[ShareService] Load shared with me failed:', error);
                this.sharedWithMe.set([]);
                return of(null);
            })
        ).subscribe(() => {
            this.isLoadingSharedWithMe.set(false);
        });
    }

    /**
     * Load files the current user has shared
     */
    loadSharedByMe(): void {
        this.isLoadingSharedByMe.set(true);
        this.http.get<{ success: boolean; resources: SharedByMeGroup[]; count: number }>(
            `${this.apiUrl}/by-me`
        ).pipe(
            tap(response => {
                if (response.success) {
                    this.sharedByMe.set(response.resources);
                    console.log('[ShareService] Shared by me loaded:', response.count);
                }
            }),
            catchError(error => {
                console.error('[ShareService] Load shared by me failed:', error);
                this.sharedByMe.set([]);
                return of(null);
            })
        ).subscribe(() => {
            this.isLoadingSharedByMe.set(false);
        });
    }

    /**
     * Get all shares for a specific resource (for the share modal)
     */
    getSharesForResource(resourceId: string): Observable<{ success: boolean; shares: Share[] }> {
        return this.http.get<{ success: boolean; shares: Share[] }>(
            `${this.apiUrl}/resource/${resourceId}`
        );
    }

    /**
     * Update permission on a share
     */
    updatePermission(shareId: string, permission: 'view' | 'download'): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${shareId}/permission`, { permission }).pipe(
            tap(() => {
                console.log('[ShareService] Permission updated:', shareId, permission);
                // Update local state
                this.updateLocalSharedByMe(shareId, { permission });
            })
        );
    }

    /**
     * Revoke a specific share
     */
    revokeShare(shareId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${shareId}/revoke`, {}).pipe(
            tap(() => {
                console.log('[ShareService] Share revoked:', shareId);
                // Update local state
                this.updateLocalSharedByMe(shareId, { status: 'revoked' as const });
            })
        );
    }

    /**
     * Stop sharing a resource entirely (revoke all shares)
     */
    stopSharing(resourceId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/resource/${resourceId}`).pipe(
            tap(() => {
                console.log('[ShareService] Stopped sharing:', resourceId);
                // Remove from local state
                this.sharedByMe.update(groups =>
                    groups.filter(g => g.resourceId !== resourceId)
                );
            })
        );
    }

    /**
     * Helper: update a recipient in the local sharedByMe state
     */
    private updateLocalSharedByMe(shareId: string, updates: Partial<SharedByMeRecipient>): void {
        this.sharedByMe.update(groups => {
            return groups.map(group => ({
                ...group,
                recipients: group.recipients.map(r =>
                    r.shareId === shareId ? { ...r, ...updates } : r
                )
            }));
        });
    }
}
