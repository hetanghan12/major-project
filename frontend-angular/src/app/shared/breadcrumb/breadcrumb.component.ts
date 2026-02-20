/**
 * Breadcrumb Navigation - Google Drive Style
 * ============================================
 * Shows current folder path with navigation
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbItem } from '../../core/models/file.model';

@Component({
    selector: 'app-breadcrumb',
    standalone: true,
    imports: [CommonModule],
    template: `
        <nav class="breadcrumb">
            <button 
                class="breadcrumb-item root"
                (click)="navigateTo(null)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>My Drive</span>
            </button>

            <ng-container *ngFor="let item of items; let last = last">
                <svg class="breadcrumb-separator" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
                
                <button 
                    class="breadcrumb-item"
                    [class.current]="last"
                    (click)="navigateTo(item.id)"
                    [disabled]="last">
                    <svg class="w-4 h-4 folder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    <span>{{ item.name }}</span>
                </button>
            </ng-container>
        </nav>
    `,
    styles: [`
        .breadcrumb {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 0;
        }

        .breadcrumb-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            transition: background 0.15s;
        }

        .breadcrumb-item:hover:not(.current):not(:disabled) {
            background: #f3f4f6;
        }

        .breadcrumb-item.root {
            color: #5b4ee8;
        }

        .breadcrumb-item.current {
            color: #1f2937;
            cursor: default;
        }

        .breadcrumb-separator {
            width: 16px;
            height: 16px;
            color: #9ca3af;
            flex-shrink: 0;
        }

        .folder-icon {
            color: #fbbf24;
        }
    `]
})
export class BreadcrumbComponent {
    @Input() items: BreadcrumbItem[] = [];
    @Output() navigate = new EventEmitter<string | null>();

    navigateTo(folderId: string | null) {
        this.navigate.emit(folderId);
    }
}
