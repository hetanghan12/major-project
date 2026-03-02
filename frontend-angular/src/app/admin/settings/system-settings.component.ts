/**
 * System Settings Component
 * =========================
 * Global configuration and feature toggles for the platform.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="system-settings">
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-slate-900">System Settings</h2>
        <p class="text-slate-500 text-sm mt-1">Configure global platform behaviour and identity</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

        <!-- Sidebar Tabs -->
        <aside class="space-y-1">
          <button *ngFor="let tab of tabs"
                  (click)="activeTab = tab.id"
                  class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  [class.bg-indigo-50]="activeTab === tab.id"
                  [class.text-indigo-700]="activeTab === tab.id"
                  [class.text-slate-500]="activeTab !== tab.id"
                  [class.hover:bg-slate-50]="activeTab !== tab.id">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.icon"/>
            </svg>
            {{ tab.label }}
          </button>
        </aside>

        <!-- Content Panel -->
        <div class="lg:col-span-3 space-y-6">

          <!-- Loading -->
          <div *ngIf="loading()" class="card bg-white p-10 text-center text-slate-400 shadow-sm">
            <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading settings...</p>
          </div>

          <ng-container *ngIf="!loading()">

            <!-- ── GENERAL ── -->
            <div *ngIf="activeTab === 'general'" class="card bg-white p-8 shadow-sm">
              <h3 class="font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">General Configuration</h3>
              <div class="space-y-5 max-w-xl">

                <div>
                  <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">System / Platform Name</label>
                  <input type="text" [(ngModel)]="form.systemName"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         style="color: black !important; background-color: white !important;"
                         placeholder="e.g. Cloud Space">
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Support / Admin Email</label>
                  <input type="email" [(ngModel)]="form.adminEmail"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         style="color: black !important;"
                         placeholder="admin@example.com">
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Max File Upload Size (MB)</label>
                  <input type="number" [(ngModel)]="form.maxFileSizeMB" min="1" max="5000"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         style="color: black !important; background-color: white !important;"
                         placeholder="500">
                </div>

                <!-- Toggles -->
                <div class="pt-2 space-y-4">
                  <div class="flex items-center justify-between py-3 border-b border-slate-100">
                    <div>
                      <p class="text-sm font-semibold text-slate-700">Allow New Registrations</p>
                      <p class="text-xs text-slate-400">Let new users sign up</p>
                    </div>
                    <button type="button" (click)="form.registrationOpen = !form.registrationOpen"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                            [class.bg-indigo-500]="form.registrationOpen"
                            [class.bg-slate-200]="!form.registrationOpen">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                            [class.translate-x-6]="form.registrationOpen"
                            [class.translate-x-1]="!form.registrationOpen"></span>
                    </button>
                  </div>

                  <div class="flex items-center justify-between py-3">
                    <div>
                      <p class="text-sm font-semibold text-red-600">Maintenance Mode</p>
                      <p class="text-xs text-slate-400">Blocks all non-admin access</p>
                    </div>
                    <button type="button" (click)="form.maintenanceMode = !form.maintenanceMode"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                            [class.bg-red-500]="form.maintenanceMode"
                            [class.bg-slate-200]="!form.maintenanceMode">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                            [class.translate-x-6]="form.maintenanceMode"
                            [class.translate-x-1]="!form.maintenanceMode"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── NOTIFICATIONS ── -->
            <div *ngIf="activeTab === 'notifications'" class="card bg-white p-8 shadow-sm">
              <h3 class="font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">Notification Settings</h3>
              <div class="space-y-4 max-w-xl">
                <div *ngFor="let n of notifToggles"
                     class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p class="text-sm font-semibold text-slate-700">{{ n.label }}</p>
                    <p class="text-xs text-slate-400">{{ n.desc }}</p>
                  </div>
                  <button type="button" (click)="form[n.key] = !form[n.key]"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                          [class.bg-indigo-500]="form[n.key]"
                          [class.bg-slate-200]="!form[n.key]">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          [class.translate-x-6]="form[n.key]"
                          [class.translate-x-1]="!form[n.key]"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ── SECURITY ── -->
            <div *ngIf="activeTab === 'security'" class="card bg-white p-8 shadow-sm">
              <h3 class="font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">Security Settings</h3>
              <div class="space-y-5 max-w-xl">
                <div>
                  <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Session Timeout (minutes)</label>
                  <input type="number" [(ngModel)]="form.sessionTimeout" min="5" max="1440"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         style="color: black !important; background-color: white !important;">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Max Login Attempts</label>
                  <input type="number" [(ngModel)]="form.maxLoginAttempts" min="1" max="20"
                         class="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         style="color: black !important; background-color: white !important;">
                </div>
                <div class="flex items-center justify-between py-3 border-t border-slate-100">
                  <div>
                    <p class="text-sm font-semibold text-slate-700">Require 2FA for Admins</p>
                    <p class="text-xs text-slate-400">Force two-factor authentication</p>
                  </div>
                  <button type="button" (click)="form.require2FA = !form.require2FA"
                          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                          [class.bg-indigo-500]="form.require2FA"
                          [class.bg-slate-200]="!form.require2FA">
                    <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                          [class.translate-x-6]="form.require2FA"
                          [class.translate-x-1]="!form.require2FA"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ── INTEGRATIONS ── -->
            <div *ngIf="activeTab === 'integrations'" class="card bg-white p-8 shadow-sm">
              <h3 class="font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100">API Integrations</h3>
              <div class="space-y-5 max-w-xl">
                <div *ngFor="let integ of integrations"
                     class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                       [ngClass]="integ.bg">{{ integ.emoji }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-700">{{ integ.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ integ.desc }}</p>
                  </div>
                  <span class="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        [class.bg-emerald-100]="integ.connected"
                        [class.text-emerald-700]="integ.connected"
                        [class.bg-slate-100]="!integ.connected"
                        [class.text-slate-500]="!integ.connected">
                    {{ integ.connected ? 'CONNECTED' : 'NOT SET' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- ── ADVANCED ── -->
            <div *ngIf="activeTab === 'advanced'" class="card bg-white p-8 shadow-sm border-red-100 border">
              <h3 class="font-bold text-red-600 mb-6 pb-3 border-b border-red-100">⚠️ Advanced / Danger Zone</h3>
              <div class="space-y-4 max-w-xl">
                <div class="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p class="text-sm font-semibold text-red-700">Clear All Audit Logs</p>
                  <p class="text-xs text-red-400 mt-0.5 mb-3">Permanently removes all security log entries.</p>
                  <button class="px-4 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    Clear Logs
                  </button>
                </div>
                <div class="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p class="text-sm font-semibold text-red-700">Reset to Defaults</p>
                  <p class="text-xs text-red-400 mt-0.5 mb-3">Resets all settings to factory defaults.</p>
                  <button (click)="resetDefaults()" class="px-4 py-2 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                    Reset Settings
                  </button>
                </div>
              </div>
            </div>

            <!-- Save / Discard Bar -->
            <div *ngIf="activeTab !== 'integrations' && activeTab !== 'advanced'"
                 class="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
              <div *ngIf="saved()" class="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                Settings saved!
              </div>
              <div *ngIf="saveErr()" class="text-red-500 text-sm">{{ saveErr() }}</div>
              <div *ngIf="!saved() && !saveErr()"></div>
              <div class="flex gap-3">
                <button (click)="discard()" class="px-5 py-2 text-sm text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  Discard
                </button>
                <button (click)="save()" [disabled]="saving()"
                        class="px-6 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60">
                  <svg *ngIf="saving()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {{ saving() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>

          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    input { 
      color: black !important; 
      background-color: white !important; 
    }
    label { 
      color: #334155 !important; 
      font-weight: 700 !important;
    }
    h3 {
      color: #0f172a !important;
    }
  `]
})
export class SystemSettingsComponent implements OnInit {
  private adminService = inject(AdminService);

  loading = signal(true);
  saving  = signal(false);
  saved   = signal(false);
  saveErr = signal('');

  activeTab = 'general';

  tabs = [
    { id: 'general',      label: 'General',      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'security',     label: 'Security',     icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'integrations', label: 'Integrations', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' },
    { id: 'advanced',     label: 'Advanced',     icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  notifToggles = [
    { key: 'emailOnNewUser',    label: 'New User Registration', desc: 'Email admin when a new user signs up' },
    { key: 'emailOnFileUpload', label: 'Large File Uploads',    desc: 'Alert when file over 100 MB is uploaded' },
    { key: 'emailOnError',      label: 'System Errors',         desc: 'Send email on critical server errors' },
    { key: 'weeklyReport',      label: 'Weekly Summary Report', desc: 'Receive weekly analytics digest' },
  ];

  integrations = [
    { name: 'Firebase',   desc: 'Auth + Firestore',       emoji: '🔥', bg: 'bg-orange-50', connected: true  },
    { name: 'AWS S3',     desc: 'File Storage Bucket',    emoji: '☁️', bg: 'bg-yellow-50', connected: true  },
    { name: 'OpenAI',     desc: 'GPT-4o AI Assistant',    emoji: '🤖', bg: 'bg-emerald-50', connected: true },
    { name: 'Pinecone',   desc: 'Vector Search Index',    emoji: '🌲', bg: 'bg-green-50',  connected: true  },
  ];

  // Default form values — will be overwritten by Firestore data
  form: any = {
    systemName:        'Cloud Space',
    adminEmail:        'admin@cloudspace.com',
    maxFileSizeMB:     500,
    registrationOpen:  true,
    maintenanceMode:   false,
    sessionTimeout:    60,
    maxLoginAttempts:  5,
    require2FA:        false,
    emailOnNewUser:    true,
    emailOnFileUpload: false,
    emailOnError:      true,
    weeklyReport:      true,
  };

  private _original: any = {};

  async ngOnInit() {
    this.loading.set(true);
    const data = await this.adminService.loadSettings();
    if (data) {
      this.form = { ...this.form, ...data };
    }
    this._original = { ...this.form };
    this.loading.set(false);
  }

  async save() {
    this.saving.set(true);
    this.saved.set(false);
    this.saveErr.set('');
    const ok = await this.adminService.updateSettings(this.form);
    this.saving.set(false);
    if (ok) {
      this._original = { ...this.form };
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    } else {
      this.saveErr.set('Failed to save. Please try again.');
    }
  }

  discard() {
    this.form = { ...this._original };
    this.saved.set(false);
    this.saveErr.set('');
  }

  resetDefaults() {
    if (confirm('Reset all settings to factory defaults?')) {
      this.form = {
        systemName: 'Cloud Space', adminEmail: 'admin@cloudspace.com',
        maxFileSizeMB: 500, registrationOpen: true, maintenanceMode: false,
        sessionTimeout: 60, maxLoginAttempts: 5, require2FA: false,
        emailOnNewUser: true, emailOnFileUpload: false, emailOnError: true, weeklyReport: true,
      };
    }
  }
}
