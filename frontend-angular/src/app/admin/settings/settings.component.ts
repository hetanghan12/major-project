import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full w-full flex flex-col">
      <!-- PAGE HEADER -->
      <div class="mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">System Settings</h1>
          <p class="text-sm text-gray-500 mt-1">Configure global platform behavior and identity</p>
        </div>
      </div>

      <div class="flex flex-1 min-h-0 gap-8">
        <!-- SETTINGS NAVIGATION SIDEBAR -->
        <div class="w-64 flex-shrink-0 flex flex-col gap-2">
          
          <button class="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-bold bg-indigo-50 text-indigo-700 transition-colors">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            General
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            Notifications
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            Security
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path>
            </svg>
            Integrations
          </button>

          <button class="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Advanced
          </button>
        </div>

        <!-- SETTINGS CONTENT AREA -->
        <div class="flex-1 flex flex-col min-h-0" *ngIf="!loading; else spinner">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-y-auto mb-6">
            <div class="p-8">
              <h2 class="text-base font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">General Configuration</h2>
              
              <div class="max-w-3xl space-y-8">
                
                <!-- System Name -->
                <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">System / Platform Name</label>
                  <input type="text" [(ngModel)]="settings.systemName" class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm" placeholder="Cloud Space">
                </div>

                <!-- Admin Email -->
                <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Support / Admin Email</label>
                  <input type="email" [(ngModel)]="settings.adminEmail" class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm" placeholder="admin@cloudspace.com">
                </div>

                <!-- Max File Size -->
                <div>
                  <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max File Upload Size (MB)</label>
                  <input type="number" [(ngModel)]="settings.maxFileSizeMB" class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm" placeholder="500">
                </div>

                <div class="pt-6 border-t border-gray-100 space-y-6">
                  <!-- Registration Toggle -->
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-bold text-gray-900 mb-1">Allow New Registrations</h4>
                      <p class="text-xs text-gray-500 font-medium">Let new users sign up</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [(ngModel)]="settings.registrationOpen" class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <!-- Maintenance Mode Toggle -->
                  <div class="flex items-center justify-between">
                    <div>
                      <h4 class="text-sm font-bold text-red-600 mb-1">Maintenance Mode</h4>
                      <p class="text-xs text-gray-500 font-medium">Blocks all non-admin access</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" [(ngModel)]="settings.maintenanceMode" class="sr-only peer">
                      <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- BOTTOM ACTION BAR -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex justify-end items-center gap-4 flex-shrink-0">
            <button class="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors" [disabled]="saving">
              Discard
            </button>
            <button (click)="saveSettings()" [disabled]="saving" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-70 flex items-center">
              <svg *ngIf="saving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Loading Spinner Full Center -->
    <ng-template #spinner>
      <div class="flex-1 flex justify-center items-center">
        <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AdminSettingsComponent implements OnInit {
  private adminService = inject(AdminService);
  settings: any = {};
  loading = true;
  saving = false;

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    try {
      this.loading = true;
      const res = await this.adminService.getSettings();
      this.settings = res.data || {};
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      this.loading = false;
    }
  }

  async saveSettings() {
    try {
      this.saving = true;
      await this.adminService.updateSettings(this.settings);
      // Removed the alert since it interrupts the slick UI experience; 
      // typically in modern SaaS you'd pop a subtle toast notification instead.
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to save settings');
    } finally {
      this.saving = false;
    }
  }
}
