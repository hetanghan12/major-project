/**
 * Share Modal Component
 * ========================
 * Google Drive-style share dialog for files and folders.
 * 
 * Features:
 * - Multi-email input with chip UI
 * - Permission selection per recipient
 * - Shows existing shares for the resource
 * - Remove/revoke existing shares
 * - Optional message
 * 
 * @author CloudSpace
 */

import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareService, Share, SharedByMeRecipient } from '../../core/services/share.service';

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="share-overlay" (click)="onClose()">
            <div class="share-modal" (click)="$event.stopPropagation()">
                
                <!-- Header -->
                <div class="share-header">
                    <div class="share-header-icon">
                        <svg *ngIf="!isFolder" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <svg *ngIf="isFolder" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z"/>
                        </svg>
                    </div>
                    <div class="share-header-info">
                        <h3 class="share-title">Share "{{ fileName }}"</h3>
                        <p class="share-subtitle" *ngIf="isFolder">All files in this folder will be shared</p>
                    </div>
                    <button class="share-close-btn" (click)="onClose()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Add People Section -->
                <div class="share-input-section">
                    <div class="share-input-row">
                        <div class="share-email-input-container">
                            <!-- Email chips -->
                            <div class="share-chips" *ngIf="emailChips().length > 0">
                                <span class="share-chip" *ngFor="let chip of emailChips(); let i = index">
                                    {{ chip.email }}
                                    <button class="share-chip-remove" (click)="removeChip(i)">×</button>
                                </span>
                            </div>
                            <input 
                                type="email" 
                                class="share-email-input" 
                                placeholder="Add people by email..."
                                [(ngModel)]="emailInput"
                                (keydown.enter)="addEmailChip()"
                                (keydown.tab)="addEmailChip(); $event.preventDefault()"
                                (keydown.comma)="addEmailChip(); $event.preventDefault()"
                                (blur)="addEmailChip()"
                            />
                        </div>
                        <select class="share-permission-select" [(ngModel)]="selectedPermission">
                            <option value="view">👁 Can view</option>
                            <option value="edit">✏️ Can edit</option>
                            <option value="download">⬇️ Can download</option>
                        </select>
                    </div>

                    <!-- Optional message -->
                    <div class="share-message-container" *ngIf="emailChips().length > 0">
                        <textarea 
                            class="share-message-input"
                            placeholder="Add a message (optional)"
                            [(ngModel)]="shareMessage"
                            rows="2"
                        ></textarea>
                    </div>
                </div>

                <!-- Current Shares Section -->
                <div class="share-people-section" *ngIf="existingShares().length > 0">
                    <h4 class="share-section-title">People with access</h4>
                    <div class="share-people-list">
                        <div class="share-person" *ngFor="let share of existingShares()">
                            <div class="share-person-avatar">
                                {{ getInitial(share.recipientEmail) }}
                            </div>
                            <div class="share-person-info">
                                <span class="share-person-email">{{ share.recipientEmail }}</span>
                                <span class="share-person-status" [class]="'status-' + share.status">
                                    {{ share.status }}
                                </span>
                            </div>
                            <div class="share-person-actions" *ngIf="share.status !== 'revoked'">
                                <select 
                                    class="share-person-permission"
                                    [ngModel]="share.permission"
                                    (ngModelChange)="onPermissionChange(share.shareId, $event)">
                                    <option value="view">Can view</option>
                                    <option value="edit">Can edit</option>
                                    <option value="download">Can download</option>
                                </select>
                                <button class="share-revoke-btn" (click)="onRevoke(share.shareId)" title="Remove access">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            <span *ngIf="share.status === 'revoked'" class="share-revoked-badge">Revoked</span>
                        </div>
                    </div>
                </div>

                <!-- Status Messages -->
                <div *ngIf="shareResult()" class="share-result">
                    <div class="share-result-item" *ngFor="let r of shareResult()">
                        <span class="share-result-email">{{ r.recipientEmail || r.email }}</span>
                        <span class="share-result-status" [class]="'result-' + r.status">
                            {{ getStatusLabel(r.status) }}
                        </span>
                    </div>
                </div>

                <!-- Footer -->
                <div class="share-footer">
                    <button class="share-copy-link" (click)="copyLink()">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                        </svg>
                        Copy link
                    </button>
                    <div class="share-footer-actions">
                        <button class="btn-secondary" (click)="onClose()">Cancel</button>
                        <button 
                            class="btn-primary" 
                            (click)="onShare()" 
                            [disabled]="emailChips().length === 0 || isSharing()">
                            <span *ngIf="!isSharing()">Share</span>
                            <span *ngIf="isSharing()" class="flex items-center gap-2">
                                <div class="spinner w-4 h-4"></div>
                                Sharing...
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .share-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .share-modal {
            background: var(--card-bg, white);
            border-radius: 16px;
            width: 520px;
            max-width: 95vw;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.2s ease-out;
        }

        .share-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 20px 24px 16px;
            border-bottom: 1px solid var(--border, #e5e7eb);
        }

        .share-header-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        }

        .share-header-info {
            flex: 1;
            min-width: 0;
        }

        .share-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary, #1f2937);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0;
        }

        .share-subtitle {
            font-size: 12px;
            color: var(--text-muted, #9ca3af);
            margin: 2px 0 0 0;
        }

        .share-close-btn {
            padding: 6px;
            border-radius: 8px;
            color: var(--text-muted, #9ca3af);
            transition: all 0.15s;
        }

        .share-close-btn:hover {
            background: var(--hover-bg, #f3f4f6);
            color: var(--text-primary, #374151);
        }

        /* Input Section */
        .share-input-section {
            padding: 16px 24px;
        }

        .share-input-row {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .share-email-input-container {
            flex: 1;
            min-width: 0;
            border: 2px solid var(--border, #e5e7eb);
            border-radius: 10px;
            padding: 6px 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
            transition: border-color 0.2s;
            background: var(--input-bg, white);
        }

        .share-email-input-container:focus-within {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .share-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }

        .share-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: linear-gradient(135deg, #eef2ff, #e0e7ff);
            color: #4338ca;
            padding: 3px 8px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }

        .share-chip-remove {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            line-height: 1;
            color: #6366f1;
            transition: all 0.15s;
        }

        .share-chip-remove:hover {
            background: #c7d2fe;
            color: #4338ca;
        }

        .share-email-input {
            flex: 1;
            min-width: 160px;
            border: none;
            outline: none;
            padding: 6px 4px;
            font-size: 14px;
            background: transparent;
            color: var(--text-primary, #1f2937);
        }

        .share-email-input::placeholder {
            color: var(--text-muted, #9ca3af);
        }

        .share-permission-select {
            padding: 10px 12px;
            border: 2px solid var(--border, #e5e7eb);
            border-radius: 10px;
            font-size: 13px;
            color: var(--text-primary, #374151);
            background: var(--input-bg, white);
            cursor: pointer;
            white-space: nowrap;
            transition: border-color 0.2s;
        }

        .share-permission-select:focus {
            border-color: #6366f1;
            outline: none;
        }

        /* Message */
        .share-message-container {
            margin-top: 12px;
        }

        .share-message-input {
            width: 100%;
            border: 2px solid var(--border, #e5e7eb);
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 13px;
            resize: none;
            color: var(--text-primary, #374151);
            background: var(--input-bg, white);
            transition: border-color 0.2s;
        }

        .share-message-input:focus {
            border-color: #6366f1;
            outline: none;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .share-message-input::placeholder {
            color: var(--text-muted, #9ca3af);
        }

        /* People with access */
        .share-people-section {
            padding: 0 24px 16px;
            border-top: 1px solid var(--border, #e5e7eb);
            margin-top: 4px;
        }

        .share-section-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary, #6b7280);
            padding: 12px 0 8px;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .share-people-list {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .share-person {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 8px;
            border-radius: 10px;
            transition: background 0.15s;
        }

        .share-person:hover {
            background: var(--hover-bg, #f9fafb);
        }

        .share-person-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            flex-shrink: 0;
            text-transform: uppercase;
        }

        .share-person-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .share-person-email {
            font-size: 14px;
            color: var(--text-primary, #1f2937);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .share-person-status {
            font-size: 11px;
            font-weight: 500;
        }

        .status-active { color: #059669; }
        .status-pending { color: #d97706; }
        .status-revoked { color: #ef4444; }

        .share-person-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }

        .share-person-permission {
            padding: 4px 6px;
            border: 1px solid var(--border, #e5e7eb);
            border-radius: 6px;
            font-size: 12px;
            color: var(--text-primary, #6b7280);
            background: transparent;
            cursor: pointer;
        }

        .share-revoke-btn {
            padding: 4px;
            border-radius: 6px;
            color: var(--text-muted, #9ca3af);
            transition: all 0.15s;
        }

        .share-revoke-btn:hover {
            background: #fee2e2;
            color: #ef4444;
        }

        .share-revoked-badge {
            font-size: 11px;
            color: #ef4444;
            background: #fee2e2;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 500;
        }

        /* Result Messages */
        .share-result {
            padding: 8px 24px 0;
        }

        .share-result-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            border-radius: 8px;
            background: var(--hover-bg, #f9fafb);
            margin-bottom: 4px;
            font-size: 13px;
        }

        .share-result-email {
            color: var(--text-primary, #374151);
        }

        .result-active { color: #059669; font-weight: 500; }
        .result-pending { color: #d97706; font-weight: 500; }
        .result-duplicate { color: #6b7280; font-style: italic; }
        .result-failed { color: #ef4444; font-weight: 500; }

        /* Footer */
        .share-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 24px;
            border-top: 1px solid var(--border, #e5e7eb);
        }

        .share-copy-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            color: #6366f1;
            font-weight: 500;
            transition: all 0.15s;
        }

        .share-copy-link:hover {
            background: #eef2ff;
        }

        .share-footer-actions {
            display: flex;
            gap: 8px;
        }

        /* Spinner */
        .spinner {
            border: 2px solid transparent;
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `]
})
export class ShareModalComponent implements OnInit, OnChanges {
    @Input() resourceId: string = '';
    @Input() fileName: string = '';
    @Input() isFolder: boolean = false;
    @Output() close = new EventEmitter<void>();

    emailInput = '';
    selectedPermission: 'view' | 'edit' | 'download' = 'view';
    shareMessage = '';
    emailChips = signal<{ email: string }[]>([]);
    existingShares = signal<any[]>([]);
    shareResult = signal<any[] | null>(null);
    isSharing = signal(false);

    constructor(private shareService: ShareService) { }

    ngOnInit() {
        this.loadExistingShares();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['resourceId'] && this.resourceId) {
            this.loadExistingShares();
        }
    }

    loadExistingShares() {
        if (!this.resourceId) return;
        this.shareService.getSharesForResource(this.resourceId).subscribe({
            next: (response) => {
                if (response.success) {
                    this.existingShares.set(response.shares.filter(s => s.status !== 'revoked'));
                }
            },
            error: (err) => {
                console.error('[ShareModal] Failed to load existing shares:', err);
            }
        });
    }

    addEmailChip() {
        const email = this.emailInput.trim().toLowerCase().replace(/,/g, '');
        if (!email || !email.includes('@') || !email.includes('.')) return;

        // Prevent duplicate chips
        const chips = this.emailChips();
        if (chips.some(c => c.email === email)) {
            this.emailInput = '';
            return;
        }

        this.emailChips.set([...chips, { email }]);
        this.emailInput = '';
    }

    removeChip(index: number) {
        const chips = [...this.emailChips()];
        chips.splice(index, 1);
        this.emailChips.set(chips);
    }

    onShare() {
        const chips = this.emailChips();
        if (chips.length === 0) return;

        this.isSharing.set(true);
        this.shareResult.set(null);

        const recipients = chips.map(c => ({
            email: c.email,
            permission: this.selectedPermission
        }));

        this.shareService.createShares({
            resourceId: this.resourceId,
            recipients,
            message: this.shareMessage || undefined
        }).subscribe({
            next: (response) => {
                this.isSharing.set(false);
                this.shareResult.set(response.shares);
                this.emailChips.set([]);
                this.shareMessage = '';
                // Refresh existing shares list
                this.loadExistingShares();
            },
            error: (err) => {
                this.isSharing.set(false);
                console.error('[ShareModal] Failed to create shares:', err);
            }
        });
    }

    onPermissionChange(shareId: string, newPermission: string) {
        this.shareService.updatePermission(shareId, newPermission as any).subscribe({
            next: () => {
                // Update local state
                this.existingShares.update(shares =>
                    shares.map(s => s.shareId === shareId ? { ...s, permission: newPermission } : s)
                );
            },
            error: (err) => console.error('[ShareModal] Failed to update permission:', err)
        });
    }

    onRevoke(shareId: string) {
        this.shareService.revokeShare(shareId).subscribe({
            next: () => {
                // Remove from list
                this.existingShares.update(shares =>
                    shares.filter(s => s.shareId !== shareId)
                );
            },
            error: (err) => console.error('[ShareModal] Failed to revoke share:', err)
        });
    }

    copyLink() {
        const url = `${window.location.origin}/documents?preview=${this.resourceId}`;
        navigator.clipboard.writeText(url).then(() => {
            console.log('[ShareModal] Link copied to clipboard');
        });
    }

    onClose() {
        this.close.emit();
    }

    getInitial(email: string): string {
        return email ? email.charAt(0).toUpperCase() : '?';
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'active': return '✓ Shared';
            case 'pending': return '⏳ Pending (not registered)';
            case 'duplicate': return 'Already shared';
            case 'failed': return '✗ Failed';
            default: return status;
        }
    }
}
