import { Component, signal, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { SettingsService, UserSettings } from '../core/services/settings.service';
import { DocumentService } from '../core/services/document.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
   <div class="animate-in bg-[#f4f7f6] min-h-[calc(100vh-64px)] pb-12 flex flex-col">
       <div class="px-8 mt-6 mb-6 flex items-center justify-between">
           <div>
               <h1 class="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
               <p class="text-sm text-gray-500 mt-1">Manage your account, preferences, and billing.</p>
           </div>
           
           <div *ngIf="settingsService.isLoading()" class="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 px-4 py-2 rounded-lg">
               <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
               <nav class="flex flex-col gap-1 w-full bg-white rounded-[16px] p-2 border border-gray-100 shadow-sm">
                   <button *ngFor="let tab of tabs" 
                           (click)="activeTab.set(tab.id)"
                           [class.bg-indigo-50]="activeTab() === tab.id"
                           [class.text-indigo-600]="activeTab() === tab.id"
                           [class.text-gray-600]="activeTab() !== tab.id"
                           [class.hover:bg-gray-50]="activeTab() !== tab.id"
                           class="flex items-center gap-3 px-4 py-2.5 rounded-[10px] font-medium transition-colors text-left w-full text-[14px]">
                       <span class="w-5 h-5 flex items-center justify-center" 
                             [class.text-indigo-600]="activeTab() === tab.id" 
                             [class.text-gray-400]="activeTab() !== tab.id" 
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
                            <h2 class="text-[20px] font-bold text-gray-900">Account Settings</h2>
                            <p class="text-[14px] text-gray-500 mt-1">Update your photo and personal details.</p>
                        </div>
                        
                        <!-- Profile Card -->
                        <div class="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden mb-6">
                            <div class="p-6">
                                <input type="file" #photoInput accept="image/jpeg,image/png,image/gif" (change)="onPhotoSelected($event)" class="hidden">
                                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <div class="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center text-3xl font-bold shadow-inner shrink-0 overflow-hidden">
                                        <img *ngIf="authService.currentUser()?.photoURL" [src]="authService.currentUser()?.photoURL" class="w-full h-full object-cover" alt="Profile">
                                        <span *ngIf="!authService.currentUser()?.photoURL">{{ getUserInitial() }}</span>
                                    </div>
                                    <div class="space-y-3 flex-1">
                                        <div class="flex flex-wrap gap-3">
                                            <button (click)="photoInput.click()" [disabled]="isUploadingPhoto" class="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50">
                                                {{ isUploadingPhoto ? 'Uploading...' : 'Upload new photo' }}
                                            </button>
                                            <button (click)="removePhoto()" *ngIf="authService.currentUser()?.photoURL" class="px-4 py-2 bg-white border border-gray-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors shadow-sm">
                                                Remove
                                            </button>
                                        </div>
                                        <p class="text-xs text-gray-400">Must be JPEG, PNG, or GIF and cannot exceed 5MB.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="border-t border-gray-100/80 p-6 space-y-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                    <input type="text" [(ngModel)]="fullName" class="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm text-gray-900 bg-gray-50/30" placeholder="John Doe">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <div class="flex flex-col sm:flex-row gap-3 max-w-md">
                                        <input type="email" [value]="authService.currentUser()?.email || ''" disabled class="flex-1 px-4 py-2.5 border border-gray-200 bg-gray-100 rounded-xl text-sm text-gray-500 cursor-not-allowed">
                                        <button class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors shrink-0">
                                            Change Email
                                        </button>
                                    </div>
                                </div>
                                <div class="pt-4 border-t border-gray-50">
                                    <button (click)="saveProfile()" [disabled]="isSavingProfile" class="px-5 py-2.5 bg-[#5B4EE8] hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-indigo-500/20 flex items-center gap-2">
                                        {{ isSavingProfile ? 'Saving...' : 'Save Changes' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Danger Zone -->
                        <div class="bg-[#FFF4F4] rounded-[16px] border border-[#FECACA] overflow-hidden">
                            <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-[#b91c1c]">Delete Account</h3>
                                    <p class="text-[13px] text-red-800/80 mt-1 max-w-md">Permanently remove your account and all stored files. This action cannot be undone.</p>
                                </div>
                                <button (click)="initiateDeleteAccount()" class="shrink-0 px-4 py-2.5 bg-white text-[#dc2626] border border-[#fca5a5] hover:bg-red-50 rounded-xl text-sm font-bold transition-colors shadow-sm">
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- SECURITY TAB -->
                    <div *ngSwitchCase="'security'" class="animate-in fade-in duration-300">
                        <div class="mb-6">
                            <h2 class="text-[20px] font-bold text-gray-900">Security</h2>
                            <p class="text-[14px] text-gray-500 mt-1">Manage your password, 2FA, and active sessions.</p>
                        </div>
                        
                        <div class="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden mb-6">
                            <div class="p-6 space-y-6">
                                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div class="flex-1">
                                        <h3 class="text-[15px] font-bold text-gray-900">Change Password</h3>
                                        <p class="text-[13px] text-gray-500 mt-0.5">Ensure your account is using a long, random password to stay secure.</p>
                                    </div>
                                    <button (click)="router.navigate(['/settings/change-password'])" class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shrink-0 mt-1">
                                        Update Password
                                    </button>
                                </div>
                                <div class="border-t border-gray-100/80 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-[15px] font-bold text-gray-900">Multi-factor Authentication</h3>
                                            <span *ngIf="mfaEnabled" class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Enabled</span>
                                            <span *ngIf="!mfaEnabled" class="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md">Disabled</span>
                                        </div>
                                        <p class="text-[13px] text-gray-500 mt-0.5">Add an extra layer of security to your account using an authenticator app.</p>
                                    </div>
                                    <button (click)="router.navigate(['/settings/security'])" class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shrink-0">
                                        Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STORAGE TAB -->
                    <div *ngSwitchCase="'storage'" class="animate-in fade-in duration-300">
                        <div class="mb-6">
                            <h2 class="text-[20px] font-bold text-gray-900">Storage Settings</h2>
                            <p class="text-[14px] text-gray-500 mt-1">Manage your storage preferences.</p>
                        </div>

                        <div class="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden">
                            <div class="p-6 space-y-6">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 class="text-[15px] font-bold text-gray-900">Default Upload Folder</h3>
                                        <p class="text-[13px] text-gray-500 mt-0.5">Choose where files are placed by default.</p>
                                    </div>
                                    <select [ngModel]="localSettings.storage.defaultFolder" (ngModelChange)="updateStorageSetting('defaultFolder', $event)" class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-indigo-500 shrink-0">
                                        <option value="root">Root (My Files)</option>
                                        <option value="auto">Auto-categorized</option>
                                        <option *ngFor="let folder of folders()" [value]="folder.documentId">{{ folder.fileName }}</option>
                                    </select>
                                </div>
                                <div class="border-t border-gray-100/80 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 class="text-[15px] font-bold text-gray-900">Auto-delete Trash</h3>
                                        <p class="text-[13px] text-gray-500 mt-0.5">Automatically empty trash after a set period.</p>
                                    </div>
                                    <select [ngModel]="localSettings.storage.autoDeleteTrash" (ngModelChange)="updateStorageSetting('autoDeleteTrash', $event)" class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-indigo-500 shrink-0">
                                        <option value="never">Never</option>
                                        <option value="30_days">After 30 days</option>
                                        <option value="60_days">After 60 days</option>
                                        <option value="immediate">Immediately</option>
                                    </select>
                                </div>
                                <div class="border-t border-gray-100/80 pt-6 flex items-center justify-between gap-4">
                                    <div>
                                        <h3 class="text-[15px] font-bold text-gray-900">File Versioning</h3>
                                        <p class="text-[13px] text-gray-500 mt-0.5">Keep previous versions of modified files.</p>
                                    </div>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" [ngModel]="localSettings.storage.fileVersioning" (ngModelChange)="updateStorageSetting('fileVersioning', $event)" class="sr-only peer">
                                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- AI SETTINGS TAB -->
                    <div *ngSwitchCase="'ai'" class="animate-in fade-in duration-300">
                        <div class="mb-6">
                            <h2 class="text-[20px] font-bold text-gray-900">AI Features</h2>
                            <p class="text-[14px] text-gray-500 mt-1">Configure your AI assistant permissions and preferences.</p>
                        </div>

                        <div class="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden mb-6 p-6 space-y-6">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-gray-900">AI Access Scope</h3>
                                    <p class="text-[13px] text-gray-500 mt-0.5">Select which files AI can read and index.</p>
                                </div>
                                <select [ngModel]="localSettings.ai.accessScope" (ngModelChange)="updateAISetting('accessScope', $event)" class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-indigo-500 shrink-0">
                                    <option value="all">All Files</option>
                                    <option value="specific">Specific Folders Only</option>
                                    <option value="none">None (Disable AI completely)</option>
                                </select>
                            </div>
                            <div class="border-t border-gray-100/80 pt-6 flex items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-gray-900">Auto-Summary</h3>
                                    <p class="text-[13px] text-gray-500 mt-0.5">Generate automatic summaries when viewing long documents.</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" [ngModel]="localSettings.ai.autoSummary" (ngModelChange)="updateAISetting('autoSummary', $event)" class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            <div class="border-t border-gray-100/80 pt-6 flex items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-gray-900">Smart Tagging</h3>
                                    <p class="text-[13px] text-gray-500 mt-0.5">AI will automatically suggest tags based on file contents.</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" [ngModel]="localSettings.ai.smartTagging" (ngModelChange)="updateAISetting('smartTagging', $event)" class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                        </div>

                        <!-- Danger Zone for AI -->
                        <div class="bg-[#FFF8F1] rounded-[16px] border border-[#FED7AA] overflow-hidden">
                            <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-[15px] font-bold text-[#ea580c]">Clear AI History</h3>
                                    <p class="text-[13px] text-[#ea580c]/80 mt-1 max-w-md">Delete all past AI conversations and generated embeddings. Your files will not be affected.</p>
                                </div>
                                <button (click)="clearAIHistory()" class="shrink-0 px-4 py-2.5 bg-white text-[#ea580c] border border-[#fed7aa] hover:bg-orange-50 rounded-xl text-sm font-bold transition-colors shadow-sm">
                                    Clear History
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- OTHER TABS -->
                    <div *ngSwitchDefault class="animate-in fade-in duration-300">
                        <div class="bg-white rounded-[16px] shadow-sm border border-gray-100 p-16 text-center flex flex-col items-center justify-center">
                            <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-5 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </div>
                            <h3 class="text-[18px] font-bold text-gray-900 mb-2">Coming Soon</h3>
                            <p class="text-[14px] text-gray-500 max-w-sm">These settings are currently under active development and will be available in our next major update.</p>
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

    // Computed folders for setting default
    folders = computed(() => this.documentService.documents ? this.documentService.documents().filter(d => (d as any).isFolder) : []);

    // Local mutable copy of settings so that the UI can update instantly
    // before the HTTP call finishes.
    localSettings: UserSettings = {
        storage: { defaultFolder: 'root', autoDeleteTrash: '30_days', fileVersioning: true },
        ai: { accessScope: 'all', autoSummary: true, smartTagging: true }
    };

    private sub?: Subscription;

    tabs = [
        { id: 'account', label: 'Account', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' },
        { id: 'security', label: 'Security', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' },
        { id: 'storage', label: 'Storage', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>' },
        { id: 'notifications', label: 'Notifications', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>' },
        { id: 'privacy', label: 'Privacy', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>' },
        { id: 'ai', label: 'AI Settings', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
        { id: 'appearance', label: 'Appearance', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
        { id: 'integrations', label: 'Integrations', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
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
        this.documentService.loadDocuments(); // Load folders


        this.sub = this.settingsService.loadSettings().subscribe({
            next: (res) => {
                if (res.success && res.settings) {
                    // Initialize local model. Make sure all fields are present.
                    this.localSettings = {
                        storage: { ...this.localSettings.storage, ...res.settings.storage },
                        ai: { ...this.localSettings.ai, ...res.settings.ai }
                    };
                }
            }
        });

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



    updateStorageSetting(key: 'defaultFolder' | 'autoDeleteTrash' | 'fileVersioning', value: any): void {
        this.localSettings.storage[key] = value as never;
        // Ensure UI stays in sync by forcefully updating the property binding reference via spread
        this.localSettings = { ...this.localSettings, storage: { ...this.localSettings.storage } };

        this.settingsService.updateSettings({ storage: this.localSettings.storage }).subscribe({
            next: () => this.showToast('Storage setting updated!'),
            error: () => this.showToast('Failed to save setting.', 'error')
        });
    }

    updateAISetting(key: 'accessScope' | 'autoSummary' | 'smartTagging', value: any): void {
        this.localSettings.ai[key] = value as never;
        this.settingsService.updateSettings({ ai: this.localSettings.ai }).subscribe({
            next: () => this.showToast('AI setting updated!'),
            error: () => this.showToast('Failed to save setting.', 'error')
        });
    }

    clearAIHistory(): void {
        if (confirm('Are you sure you want to clear your AI history? This cannot be undone.')) {
            this.settingsService.clearAIHistory().subscribe({
                next: () => this.showToast('AI History cleared'),
                error: () => this.showToast('Failed to clear history', 'error')
            });
        }
    }

    initiateDeleteAccount(): void {
        if (confirm('DANGER: This will permanently delete your account and files! Are you absolutely sure?')) {
            this.settingsService.deleteAccount().subscribe({
                next: () => {
                    this.showToast('Account deleted');
                    this.authService.logout();
                    this.router.navigate(['/login']);
                },
                error: () => this.showToast('Failed to delete account', 'error')
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
