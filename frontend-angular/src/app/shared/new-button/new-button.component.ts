/**
 * New Button Component - Google Drive Style
 * ===========================================
 * "New" dropdown for creating folders and uploading files
 */

import { Component, Output, EventEmitter, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-new-button',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="new-button-wrapper">
            <button class="new-btn" (click)="toggleDropdown()">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span>New</span>
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            <div class="new-dropdown" *ngIf="isOpen()">
                <!-- Create Folder -->
                <button class="new-dropdown-item" (click)="onCreate('folder')">
                    <div class="new-dropdown-icon folder">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                    </div>
                    <span>New folder</span>
                </button>

                <div class="new-dropdown-divider"></div>

                <!-- File Upload -->
                <button class="new-dropdown-item" (click)="onCreate('file-upload')">
                    <div class="new-dropdown-icon upload">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                    </div>
                    <span>File upload</span>
                </button>

                <!-- Folder Upload -->
                <button class="new-dropdown-item" (click)="onCreate('folder-upload')">
                    <div class="new-dropdown-icon upload">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                    </div>
                    <span>Folder upload</span>
                </button>

                <div class="new-dropdown-divider"></div>

                <!-- Google Docs (placeholder) -->
                <button class="new-dropdown-item" (click)="onCreate('google-docs')">
                    <div class="new-dropdown-icon docs">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8L14,2z M16,18H8v-2h8V18z M16,14H8v-2h8V14z M13,9V3.5 L18.5,9H13z"/>
                        </svg>
                    </div>
                    <span>Document</span>
                </button>

                <button class="new-dropdown-item" (click)="onCreate('google-sheets')">
                    <div class="new-dropdown-icon sheets">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19,11V9h-6V5h-2v4H5v2h6v10h2V11H19z M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5 C21,3.9,20.1,3,19,3z"/>
                        </svg>
                    </div>
                    <span>Spreadsheet</span>
                </button>
            </div>
        </div>

        <!-- Hidden file input -->
        <input 
            #fileInput 
            type="file" 
            class="hidden" 
            multiple 
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.jpg,.jpeg,.png"
            (change)="onFileSelected($event)"/>
        
        <input 
            #folderInput 
            type="file" 
            class="hidden" 
            webkitdirectory 
            directory
            (change)="onFolderSelected($event)"/>
    `,
    styles: [`
        .new-button-wrapper {
            position: relative;
        }

        .new-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 24px;
            font-weight: 500;
            font-size: 14px;
            color: #374151;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
        }

        .new-btn:hover {
            background: #f3f4f6;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .new-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 8px;
            min-width: 260px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            padding: 8px 0;
            z-index: 50;
            animation: dropdownFade 0.15s ease-out;
        }

        @keyframes dropdownFade {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .new-dropdown-item {
            display: flex;
            align-items: center;
            gap: 14px;
            width: 100%;
            padding: 12px 20px;
            font-size: 14px;
            color: #374151;
            transition: background 0.15s;
            text-align: left;
        }

        .new-dropdown-item:hover {
            background: #f3f4f6;
        }

        .new-dropdown-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .new-dropdown-icon.folder {
            background: rgba(251, 191, 36, 0.1);
            color: #fbbf24;
        }

        .new-dropdown-icon.upload {
            background: rgba(91, 78, 232, 0.1);
            color: #5b4ee8;
        }

        .new-dropdown-icon.docs {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
        }

        .new-dropdown-icon.sheets {
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
        }

        .new-dropdown-divider {
            height: 1px;
            background: #e5e7eb;
            margin: 8px 0;
        }

        .hidden {
            display: none;
        }
    `]
})
export class NewButtonComponent {
    @Output() createFolder = new EventEmitter<void>();
    @Output() uploadFiles = new EventEmitter<FileList>();
    @Output() uploadFolder = new EventEmitter<FileList>();
    @Output() createDocument = new EventEmitter<string>();

    isOpen = signal(false);

    constructor(private elementRef: ElementRef) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    toggleDropdown() {
        this.isOpen.set(!this.isOpen());
    }

    onCreate(type: string) {
        this.isOpen.set(false);

        switch (type) {
            case 'folder':
                this.createFolder.emit();
                break;
            case 'file-upload':
                const fileInput = this.elementRef.nativeElement.querySelector('input[type="file"]:not([webkitdirectory])');
                fileInput?.click();
                break;
            case 'folder-upload':
                const folderInput = this.elementRef.nativeElement.querySelector('input[webkitdirectory]');
                folderInput?.click();
                break;
            case 'google-docs':
            case 'google-sheets':
                this.createDocument.emit(type);
                break;
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.uploadFiles.emit(input.files);
            input.value = '';
        }
    }

    onFolderSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.uploadFolder.emit(input.files);
            input.value = '';
        }
    }
}
