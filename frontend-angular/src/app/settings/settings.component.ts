import { Component, signal, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { SettingsService, UserSettings } from '../core/services/settings.service';
import { DocumentService } from '../core/services/document.service';

@Component({
    standalone: true,
    selector: 'app-settings',
    imports: [CommonModule, FormsModule],
    template: `
   <div class="animate-in bg-[var(--bg-main)] min-h-[calc(100vh-64px)] pb-12 flex flex-col">
       <div class="px-8 mt-6 mb-6 flex items-center justify-between">
           <div>
               <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
               <p class="text-sm text-[var(--text-muted)] mt-1">Manage your account, preferences, and billing.</p>
           </div>
           
           <div *ngIf="settingsService.isLoading()" class="flex items-center gap-2 text-indigo-400 font-medium bg-indigo-500/10 px-4 py-2 rounded-lg">
               <svg class="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Syncing...
           </div>

           <!-- Toast Notifications -->
           <div *ngIf="toastMessage()" class="fixed bottom-6 right-6 px-6 py-3 rounded-xl text-sm font-medium text-white shadow-lg transition-all animate-in slide-in-from-bottom" [ngClass]="toastType() === 'success' ? 'bg-emerald-600' : 'bg-red-600'">
               {{ toastMessage() }}
           </div>
       </div>
       
       <div class="px-8 flex-1 flex flex-col md:flex-row gap-8 items-start">
           <!-- LEFT NAV PANEL -->
           <div class="w-full md:w-[240px] shrink-0 sticky top-24">
               <nav class="flex flex-col gap-1 w-full bg-[var(--bg-card)] rounded-[16px] p-2 border border-[var(--border-color)] shadow-sm">
                   <button *ngFor="let tab of tabs" 
                           (click)="activeTab.set(tab.id)"
                           [ngClass]="activeTab() === tab.id ? 'bg-indigo-500/10 text-[#5B4EE8]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'"
                           class="flex items-center gap-3 px-4 py-2.5 rounded-[10px] font-medium transition-colors text-left w-full text-[14px]">
                       <span class="w-5 h-5 flex items-center justify-center" 
                             [class.text-[#5B4EE8]]="activeTab() === tab.id" 
                             [class.text-[var(--text-muted)]]="activeTab() !== tab.id" 
                             [innerHTML]="tab.icon"></span>
                       <span>{{ tab.label }}</span>
                   </button>
               </nav>
           </div>
           
           <!-- RIGHT CONTENT PANEL -->
           <div class="flex-1 max-w-[800px] w-full relative">
               
               <ng-container [ngSwitch]="activeTab()">
                    <!-- ACCOUNT TAB -->
                    <div *ngSwitchCase="'account'" class="animate-in fade-in duration-300">
                        <div class="mb-6">
                            <h2 class="text-[20px] font-bold text-[var(--text-primary)]">Account Settings</h2>
                            <p class="text-[14px] text-[var(--text-muted)] mt-1">Update your photo and personal details.</p>
                        </div>
                        
                        <!-- Profile Card -->
                        <div class="bg-[var(--bg-card)] rounded-[16px] shadow-sm border border-[var(--border-color)] overflow-hidden mb-6">
                            <div class="p-6">
                                <input type="file" #photoInput accept="image/jpeg,image/png,image/gif" (change)="onPhotoSelected($event)" class="hidden">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <div class="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center text-3xl font-bold shadow-inner shrink-0 overflow-hidden">
                                        <img *ngIf="authService.currentUser()?.photoURL" [src]="authService.currentUser()?.photoURL" class="w-full h-full object-cover" alt="Profile">
                                        <span *ngIf="!authService.currentUser()?.photoURL">{{ getUserInitial() }}</span>
                                    </div>
                                    <div class="space-y-3 flex-1">
                                        <div class="flex flex-wrap gap-3">
                                            <button (click)="photoInput.click()" [disabled]="isUploadingPhoto" class="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-sm disabled:opacity-50">
                                                {{ isUploadingPhoto ? 'Uploading...' : 'Upload new photo' }}
                                            </button>
                                            <button (click)="removePhoto()" *ngIf="authService.currentUser()?.photoURL" class="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-colors shadow-sm">
                                                Remove
                                            </button>
                                        </div>
                                        <p class="text-xs text-[var(--text-muted)]">Must be JPEG, PNG, or GIF and cannot exceed 5MB.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="border-t border-[var(--border-color)] p-6 space-y-6">
                                <div>
                                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Full Name</label>
                                    <input type="text" [(ngModel)]="fullName" class="w-full max-w-md px-4 py-2.5 border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm text-[var(--text-primary)] bg-[var(--bg-main)]" placeholder="John Doe">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email Address</label>
                                    <div class="max-w-md">
                                        <input type="email" [value]="authService.currentUser()?.email || ''" disabled class="w-full px-4 py-2.5 border border-[var(--border-color)] bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-muted)] cursor-not-allowed">
                                    </div>
                                </div>
                                <div class="pt-4 border-t border-[var(--border-color)]">
                                    <button (click)="saveProfile()" [disabled]="isSavingProfile" class="px-5 py-2.5 bg-[#5B4EE8] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-indigo-500/20 flex items-center gap-2">
                                        {{ isSavingProfile ? 'Saving...' : 'Save Changes' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Danger Zone -->
                        <div class="bg-red-500/5 rounded-[16px] border border-red-500/20 overflow-hidden">
                            <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-red-500">Delete Account</h3>
                                    <p class="text-[13px] text-red-500/70 mt-1 max-w-md">Permanently remove your account and all stored files. This action cannot be undone.</p>
                                </div>
                                <button 
                                    (click)="initiateDeleteAccount()" 
                                    [disabled]="isDeletingAccount()"
                                    class="shrink-0 px-4 py-2.5 bg-[var(--bg-card)] text-red-500 border border-red-500/30 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    <svg *ngIf="isDeletingAccount()" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {{ isDeletingAccount() ? 'Deleting...' : 'Delete Account' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- SECURITY TAB -->
                    <div *ngSwitchCase="'security'" class="animate-in fade-in duration-300">
                        <div class="mb-6">
                            <h2 class="text-[20px] font-bold text-[var(--text-primary)]">Security</h2>
                            <p class="text-[14px] text-[var(--text-muted)] mt-1">Manage your password, 2FA, and active sessions.</p>
                        </div>
                        
                        <div class="bg-[var(--bg-card)] rounded-[16px] shadow-sm border border-[var(--border-color)] overflow-hidden mb-6">
                            <div class="p-6 space-y-6">
                                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h3 class="text-[15px] font-bold text-[var(--text-primary)]">Change Password</h3>
                                        <p class="text-[13px] text-[var(--text-muted)] mt-0.5">Ensure your account is using a long, random password to stay secure.</p>
                                    </div>
                                    <button (click)="router.navigate(['/settings/change-password'])" class="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-sm shrink-0 mt-1">
                                        Update Password
                                    </button>
                                </div>
                                <div class="border-t border-[var(--border-color)] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-[15px] font-bold text-[var(--text-primary)]">Multi-factor Authentication</h3>
                                            <span *ngIf="mfaEnabled" class="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Enabled</span>
                                            <span *ngIf="!mfaEnabled" class="bg-slate-500/10 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Disabled</span>
                                        </div>
                                        <p class="text-[13px] text-[var(--text-muted)] mt-0.5">Add an extra layer of security to your account using an authenticator app.</p>
                                    </div>
                                    <button (click)="router.navigate(['/settings/security'])" class="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-sm shrink-0">
                                        Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- OTHER TABS -->
                    <div *ngSwitchDefault class="animate-in fade-in duration-300">
                        <div class="bg-[var(--bg-card)] rounded-[16px] shadow-sm border border-[var(--border-color)] p-16 text-center flex flex-col items-center justify-center">
                            <div class="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mb-5 shrink-0 border border-[var(--border-color)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--text-muted)]"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                            <h3 class="text-[18px] font-bold text-[var(--text-primary)] mb-2">Coming Soon</h3>
                            <p class="text-[14px] text-[var(--text-muted)] max-w-sm">These settings are currently under active development and will be available in our next major update.</p>
                        </div>
                    </div>
               </ng-container>
           </div>
       </div>
   </div>
  `
})
export class SettingsComponent implements OnInit, OnDestroy {
    @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
    activeTab = signal('account');
    fullName = '';
    isSavingProfile = false;
    isUploadingPhoto = false;
    toastMessage = signal<string | null>(null);
    toastType = signal<'success' | 'error'>('success');
    mfaEnabled = false;
    isDeletingAccount = signal(false);

    // Computed folders for setting default
    private sub?: Subscription;

    tabs = [
        { id: 'account', label: 'Account', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' },
        { id: 'security', label: 'Security', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' },
    ];

    constructor(
        public authService: AuthService,
        public settingsService: SettingsService,
        public documentService: DocumentService,
        public router: Router
    ) {
        effect(() => {
            const user = this.authService.currentUser();
            if (user && user.displayName && !this.fullName) {
                this.fullName = user.displayName;
            }
        });
    }

    ngOnInit(): void {
        this.sub = this.settingsService.loadSettings().subscribe();

        this.checkMfa();
    }

    ngOnDestroy(): void {
        if (this.sub) this.sub.unsubscribe();
    }

    async checkMfa() {
        this.mfaEnabled = await this.authService.checkMfaStatus();
    }

    getUserInitial(): string {
        const name = this.authService.currentUser()?.displayName;
        return name ? name.charAt(0).toUpperCase() : 'U';
    }

    async saveProfile(): Promise<void> {
        if (!this.fullName.trim()) return;
        this.isSavingProfile = true;
        try {
            await this.authService.updateProfileName(this.fullName);
            this.showToast('Profile updated successfully!');
        } catch (err) {
            this.showToast('Failed to update profile', 'error');
        } finally {
            this.isSavingProfile = false;
        }
    }

    async onPhotoSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];

        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Please select a JPEG, PNG, or GIF image.', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image must be less than 5MB.', 'error');
            return;
        }

        this.isUploadingPhoto = true;
        try {
            // Compress image to small data URL for Firebase limits
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 64; // Further compress to avoid 'photo URL too long' error
            const ratio = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Drastically lower the quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

            await this.authService.updateProfilePhoto(dataUrl);
            this.showToast('Profile photo updated!');
        } catch (err) {
            console.error('Photo upload error:', err);
            this.showToast('Failed to upload photo', 'error');
        } finally {
            this.isUploadingPhoto = false;
            input.value = ''; // Reset file input
        }
    }

    async removePhoto(): Promise<void> {
        try {
            await this.authService.updateProfilePhoto(null);
            this.showToast('Profile photo removed.');
        } catch (err) {
            this.showToast('Failed to remove photo', 'error');
        }
    }



    initiateDeleteAccount(): void {
        const confirmed = confirm('DANGER: This will permanently delete your account, ALL your files, and AI history. This action CANNOT be undone. Are you absolutely sure?');

        if (confirmed) {
            this.isDeletingAccount.set(true);
            this.settingsService.deleteAccount().subscribe({
                next: (res) => {
                    this.showToast('Account and all data deleted successfully');
                    // Give the toast a second before logging out
                    setTimeout(() => {
                        this.authService.logout();
                        this.router.navigate(['/login']);
                        this.isDeletingAccount.set(false);
                    }, 1500);
                },
                error: (err) => {
                    console.error('Account deletion failed:', err);
                    this.showToast('Failed to fully delete account. Please contact support.', 'error');
                    this.isDeletingAccount.set(false);
                }
            });
        }
    }

    showToast(message: string, type: 'success' | 'error' = 'success'): void {
        this.toastMessage.set(message);
        this.toastType.set(type);
        setTimeout(() => {
            this.toastMessage.set(null);
        }, 3000);
    }
}
