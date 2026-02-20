/**
 * Simple Upload Component
 * ========================
 * Minimal file upload component for college project.
 * 
 * @author College Project
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadService, UploadResponse } from '../core/services/upload.service';

@Component({
    selector: 'app-simple-upload',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card max-w-lg mx-auto p-8 border border-dashed border-gray-300 shadow-none">
            <h2 class="text-xl font-semibold text-gray-900 mb-6 text-center">📁 File Upload</h2>
            
            <!-- File Input -->
            <div class="mb-6">
                <input 
                    type="file" 
                    #fileInput
                    (change)="onFileSelected($event)"
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xlsx,.xls,.pptx,.ppt,.txt"
                    class="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2.5 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100
                        cursor-pointer"
                />
            </div>

            <!-- Selected File Info -->
            <div *ngIf="selectedFile" class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p class="text-gray-900 text-sm mb-1"><strong class="font-medium">Selected:</strong> {{ selectedFile.name }}</p>
                <p class="text-gray-500 text-sm mb-1"><strong class="font-medium">Size:</strong> {{ formatSize(selectedFile.size) }}</p>
                <p class="text-gray-500 text-sm"><strong class="font-medium">Type:</strong> {{ selectedFile.type }}</p>
            </div>

            <!-- Upload Button -->
            <button 
                class="btn-primary w-full justify-center"
                (click)="uploadFile()"
                [disabled]="!selectedFile || isUploading"
            >
                <svg *ngIf="isUploading" class="spinner w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ isUploading ? 'Uploading...' : 'Upload File' }}
            </button>

            <!-- Success Message -->
            <div *ngIf="uploadSuccess" class="mt-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                <div>
                    <p class="font-medium">{{ successMessage }}</p>
                    <a [href]="fileUrl" target="_blank" class="text-green-800 underline hover:text-green-900 mt-1 inline-block">View File</a>
                </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p>{{ errorMessage }}</p>
            </div>
        </div>
    `,
    styles: []
})
export class SimpleUploadComponent {
    selectedFile: File | null = null;
    isUploading = false;
    uploadSuccess = false;
    successMessage = '';
    fileUrl = '';
    errorMessage = '';

    constructor(private uploadService: UploadService) { }

    /**
     * Handle file selection
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.selectedFile = input.files[0];
            this.uploadSuccess = false;
            this.errorMessage = '';
        }
    }

    /**
     * Upload the selected file
     */
    uploadFile(): void {
        if (!this.selectedFile) {
            this.errorMessage = 'Please select a file first';
            return;
        }

        // Validate file size (5MB max)
        if (this.selectedFile.size > 5 * 1024 * 1024) {
            this.errorMessage = 'File too large. Maximum size is 5MB.';
            return;
        }

        this.isUploading = true;
        this.errorMessage = '';
        this.uploadSuccess = false;

        this.uploadService.uploadFile(this.selectedFile).subscribe({
            next: (response: UploadResponse) => {
                this.isUploading = false;
                this.uploadSuccess = true;
                this.successMessage = response.message;
                this.fileUrl = response.fileUrl;
                this.selectedFile = null;
            },
            error: (error) => {
                this.isUploading = false;
                this.errorMessage = error.error?.message || 'Upload failed. Is the server running?';
            }
        });
    }

    /**
     * Format file size for display
     */
    formatSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
