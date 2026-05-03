/**
 * New Button Component - Google Drive Style
 * ===========================================
 * "New" dropdown for creating folders and uploading files
 */

import { Component, Output, EventEmitter, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-new-button',
    imports: [CommonModule],
    template: `
        <div class="new-button-wrapper" (click)="$event.stopPropagation()">
            <button class="new-btn" type="button" (click)="toggleDropdown()">
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
                <button class="new-dropdown-item" type="button" (click)="onCreate('folder', $event)">
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
                <button class="new-dropdown-item" type="button" (click)="onCreate('file-upload', $event)">
                    <div class="new-dropdown-icon upload">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                    </div>
                    <span>File upload</span>
                </button>


            </div>
        </div>

        <!-- Hidden file input -->
        <input 
            #fileInput 
            type="file" 
            class="hidden" 
            multiple 
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.jpg,.jpeg,.png,.mp3,.wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/*,audio/*"
            (change)="onFileSelected($event)"/>
        
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
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            font-weight: 500;
            font-size: 14px;
            color: var(--text-primary);
            box-shadow: var(--shadow-sm);
            transition: all 0.2s;
        }

        .new-btn:hover {
            background: var(--bg-elevated);
            box-shadow: var(--shadow-md);
        }

        .new-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 8px;
            min-width: 260px;
            background: var(--bg-card);
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
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
            color: var(--text-primary);
            transition: background 0.15s;
            text-align: left;
        }

        .new-dropdown-item:hover {
            background: var(--bg-elevated);
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
            background: var(--border-color);
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

    onCreate(type: string, event?: MouseEvent) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.isOpen.set(false);

        switch (type) {
            case 'folder':
                this.createFolder.emit();
                break;
            case 'file-upload':
                const fileInput = this.elementRef.nativeElement.querySelector('input[type="file"]');
                fileInput?.click();
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
