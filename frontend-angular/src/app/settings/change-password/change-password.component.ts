import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <button (click)="goBack()" class="p-2 -ml-2 text-gray-400 hover:text-indigo-500 rounded-full transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Change Password</h1>
          <p class="text-sm mt-1" style="color: var(--text-muted)">Update your account password</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="rounded-2xl shadow-sm border overflow-hidden" style="background: var(--bg-card); border-color: var(--border-color)">
        <div class="p-6 sm:p-8">
          
          <div class="space-y-6">
            <!-- New Password -->
            <div>
              <label class="block text-sm font-semibold mb-1.5" style="color: var(--text-primary)">New Password</label>
              <input 
                type="password" 
                [(ngModel)]="newPassword" 
                placeholder="Enter new password" 
                class="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-color)"
              >
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="block text-sm font-semibold mb-1.5" style="color: var(--text-primary)">Confirm Password</label>
              <input 
                type="password" 
                [(ngModel)]="confirmPassword" 
                placeholder="Confirm new password" 
                class="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                style="background: var(--bg-main); color: var(--text-primary); border: 1px solid var(--border-color)"
              >
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage()" class="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg font-medium border border-red-500/20">
              {{ errorMessage() }}
            </div>

            <!-- Actions -->
            <div class="pt-4 flex items-center justify-end gap-3 border-t mt-6" style="border-color: var(--border-color)">
              <button 
                (click)="goBack()" 
                class="px-5 py-2.5 text-sm font-bold transition-colors"
                style="color: var(--text-secondary)">
                Cancel
              </button>
              <button 
                (click)="updatePassword()" 
                [disabled]="isUpdating() || !newPassword || !confirmPassword"
                class="px-6 py-2.5 bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <span *ngIf="isUpdating()" class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                {{ isUpdating() ? 'Updating...' : 'Update Password' }}
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <!-- Toast Notification -->
      <div *ngIf="showToast()" class="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl shadow-xl shadow-gray-900/10 animate-in slide-in-from-bottom-5 z-50">
        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="text-sm font-medium">Password updated successfully</span>
      </div>

    </div>
  `
})
export class ChangePasswordComponent {
  newPassword = '';
  confirmPassword = '';

  isUpdating = signal(false);
  errorMessage = signal('');
  showToast = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  goBack() {
    this.router.navigate(['/settings']);
  }

  async updatePassword() {
    this.errorMessage.set('');

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long');
      return;
    }

    this.isUpdating.set(true);
    try {
      await this.authService.updateUserPassword(this.newPassword);

      this.showToast.set(true);
      setTimeout(() => {
        this.goBack();
      }, 1500);

    } catch (error: any) {
      console.error('Password update failed', error);
      this.errorMessage.set(error.message || 'Failed to update password. You may need to sign out and sign back in to perform this action.');
    } finally {
      this.isUpdating.set(false);
    }
  }
}
