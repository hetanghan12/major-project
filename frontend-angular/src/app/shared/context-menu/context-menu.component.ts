/**
 * Context Menu Component - Google Drive Style
 * =============================================
 * Right-click context menu for files and folders
 */

import { Component, Input, Output, EventEmitter, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CloudFile, ContextMenuAction } from '../../core/models/file.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    standalone: true,
    selector: 'app-context-menu',
    imports: [CommonModule],
    template: `
        <div 
            class="context-menu"
            [style.left.px]="x"
            [style.top.px]="y"
            (click)="$event.stopPropagation()">
            
            <button 
                *ngFor="let action of actions"
                class="context-menu-item"
                [class.divider-top]="action.divider"
                [class.danger]="action.danger"
                [class.disabled]="action.disabled"
                (click)="onAction(action.id)"
                [disabled]="action.disabled">
                <span class="context-menu-icon" [innerHTML]="action.icon"></span>
                <span>{{ action.label }}</span>
            </button>
        </div>
    `,
    styles: [`
        .context-menu {
            position: fixed;
            min-width: 200px;
            background: var(--bg-card, white);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            border: 1px solid var(--border-color, #e5e7eb);
            padding: 4px 0;
            z-index: 1000;
            animation: fadeIn 0.1s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }

        .context-menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 10px 16px;
            font-size: 14px;
            color: var(--text-primary, #374151);
            transition: background 0.15s;
            text-align: left;
            background: transparent;
        }

        .context-menu-item:hover:not(.disabled) {
            background: var(--bg-hover, #f3f4f6);
        }

        .context-menu-item.divider-top {
            border-top: 1px solid var(--border-color, #e5e7eb);
            margin-top: 4px;
            padding-top: 14px;
        }

        .context-menu-item.danger {
            color: #ef4444;
        }

        .context-menu-item.danger:hover {
            background: var(--danger-bg, #fef2f2);
        }

        .context-menu-item.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .context-menu-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .context-menu-icon :global(svg) {
            width: 18px;
            height: 18px;
        }
    `]
})
export class ContextMenuComponent implements OnInit {
    @Input() x: number = 0;
    @Input() y: number = 0;
    @Input() file: CloudFile | null = null;
    @Input() currentFilter: string | null = null;
    @Output() action = new EventEmitter<string>();
    @Output() close = new EventEmitter<void>();

    actions: ContextMenuAction[] = [];

    constructor(
        private elementRef: ElementRef,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.buildActions();
        this.adjustPosition();
    }

    @HostListener('document:click', ['$event'])
    @HostListener('document:contextmenu', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.close.emit();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        this.close.emit();
    }

    private buildActions() {
        if (!this.file) return;

        const svgOpen = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>';
        const svgDownload = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>';
        const svgStar = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>';
        const svgRename = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>';
        const svgMove = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
        const svgCopy = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
        const svgShare = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>';
        const svgDetails = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        const svgTrash = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';

        if (this.file.isTrashed) {
            this.actions = [
                { id: 'restore', label: 'Restore', icon: svgMove },
                { id: 'delete-permanent', label: 'Delete permanently', icon: svgTrash, danger: true, divider: true }
            ];
        } else {
            const currentUserId = this.authService.currentUser()?.uid;
            const ownerId = this.file.ownerUserId || this.file.userId;
            const isOwner = currentUserId === ownerId;

            this.actions = [
                { id: 'preview', label: 'Preview', icon: svgOpen },
                { id: 'download', label: 'Download', icon: svgDownload, disabled: this.file.isFolder },
                { id: this.file.isStarred ? 'unstar' : 'star', label: this.file.isStarred ? 'Remove from starred' : 'Add to starred', icon: svgStar, divider: true },
                { id: 'rename', label: 'Rename', icon: svgRename },
                { id: 'move', label: 'Move to', icon: svgMove },
                { id: 'copy', label: 'Make a copy', icon: svgCopy }
            ];

            // Only owners can share or stop sharing
            if (isOwner) {
                this.actions.push(
                    { id: 'share', label: 'Share', icon: svgShare, divider: true }
                );

                // Requirement: Only show 'Stop sharing' in 'shared-by-me' view
                if (this.currentFilter === 'shared-by-me') {
                    this.actions.push(
                        { id: 'stop-sharing', label: 'Stop sharing', icon: svgTrash }
                    );
                }
            }

            this.actions.push(
                { id: 'details', label: 'File details', icon: svgDetails, divider: !isOwner },
                { id: 'delete', label: 'Move to trash', icon: svgTrash, danger: true, divider: true }
            );
        }
    }

    private adjustPosition() {
        // Adjust menu position to stay within viewport
        setTimeout(() => {
            const menu = this.elementRef.nativeElement.querySelector('.context-menu');
            if (menu) {
                const rect = menu.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (rect.right > viewportWidth) {
                    this.x = this.x - rect.width;
                }
                if (rect.bottom > viewportHeight) {
                    this.y = this.y - rect.height;
                }
            }
        });
    }

    onAction(actionId: string) {
        this.action.emit(actionId);
        this.close.emit();
    }
}
