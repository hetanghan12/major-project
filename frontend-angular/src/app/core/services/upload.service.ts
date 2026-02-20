/**
 * Upload Service - SECURE VERSION
 * ================================
 * 
 * ⚠️ SECURITY NOTICE:
 * This service now uses the SECURE upload endpoint that requires authentication.
 * The old insecure endpoint has been deprecated.
 * 
 * RECOMMENDED: Use DocumentService.uploadDocument() instead for full functionality.
 * 
 * @author College Project - Security Fixed
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// Upload response interface
export interface UploadResponse {
    success: boolean;
    message: string;
    fileUrl: string;
    document?: {
        documentId: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        storagePath: string;
        vectorCount: number;
        status: string;
        uploadedAt: string;
    };
    file?: {
        originalName: string;
        filename: string;
        size: number;
        mimetype: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    /**
     * SECURITY: Use the secure API endpoint
     * Old insecure endpoint: http://localhost:3000/upload (DISABLED)
     * New secure endpoint: /api/secure/documents/upload
     */
    private secureUploadUrl = `${environment.apiUrl}/secure/documents/upload`;

    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) { }

    /**
     * Upload a single file (SECURE)
     * 
     * SECURITY:
     * - Requires valid Firebase token (added by authInterceptor)
     * - File is stored in user-isolated directory on server
     * - Vectors are stored in user-isolated Pinecone namespace
     * 
     * @param file - The file to upload
     * @returns Observable with upload response
     */
    uploadFile(file: File): Observable<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        // SECURITY: Do NOT include userId - server extracts it from verified token
        // The authInterceptor automatically adds the Authorization header

        return this.http.post<UploadResponse>(this.secureUploadUrl, formData);
    }
}

