/**
 * User Management Component
 * =========================
 * Administrative table for managing users and roles.
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-management">

      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">User Management</h2>
          <p class="text-slate-500 text-sm mt-1">{{ filteredUsers().length }} of {{ users().length }} users shown</p>
        </div>
        <button class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                (click)="openAddModal()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add New User
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div class="relative flex-1 min-w-[260px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>

        <div class="flex gap-3">
          <select class="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  [ngModel]="statusFilter()"
                  (ngModelChange)="statusFilter.set($event)">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Deactivated">Deactivated</option>
          </select>

          <button class="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  (click)="refresh()">
            ↻ Refresh
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <!-- Loading -->
        <div *ngIf="loading()" class="py-16 text-center text-slate-400">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Loading users...
        </div>

        <table *ngIf="!loading()" class="w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">User</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Role</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Status</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Joined</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Last Login</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr *ngFor="let user of filteredUsers()" class="user-row transition-colors">
              <!-- User -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {{ (user.email || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-800">{{ user.displayName || 'Unnamed User' }}</p>
                    <p class="text-xs text-slate-500">{{ user.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Role -->
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold" [ngClass]="{
                  'bg-indigo-100 text-indigo-700': user.role === 'Admin',
                  'bg-slate-100 text-slate-600':  user.role === 'User' || !user.role
                }">
                  {{ user.role || 'User' }}
                </span>
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span class="flex items-center gap-1.5 text-xs font-semibold" [ngClass]="{
                    'text-emerald-600': user.status === 'Active'  || !user.status,
                    'text-amber-500':   user.status === 'Inactive',
                    'text-red-500':     user.status === 'Deactivated'
                  }">
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ user.status || 'Active' }}
                  </span>
                  <span *ngIf="user.lockout?.isLocked"
                        class="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded w-fit border border-red-100">
                    🔒 LOCKED
                  </span>
                </div>
              </td>

              <!-- Joined -->
              <td class="px-6 py-4 text-sm text-slate-500">
                {{ user.createdAt ? (user.createdAt | date:'mediumDate') : '—' }}
              </td>

              <!-- Last Login -->
              <td class="px-6 py-4 text-sm text-slate-500">
                {{ user.lastLogin ? (user.lastLogin | date:'mediumDate') : '—' }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1">
                  <!-- Unlock -->
                  <button *ngIf="user.lockout?.isLocked"
                          (click)="onUnlock(user)"
                          class="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          title="Unlock Account">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                    </svg>
                  </button>

                  <!-- Edit -->
                  <button (click)="openEditModal(user)"
                          class="p-2 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit User">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>

                  <!-- Delete -->
                  <button (click)="onDelete(user)"
                          class="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete User">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr *ngIf="!filteredUsers().length">
              <td colspan="6" class="px-6 py-14 text-center text-slate-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <p class="font-medium text-slate-500 mb-1">No users found</p>
                <p class="text-xs">Try adjusting your search or filters.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── EDIT USER MODAL ── -->
    <div *ngIf="showEditModal()" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" (click)="closeModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8" (click)="$event.stopPropagation()">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-900">{{ modalMode() === 'add' ? 'Add New User' : 'Edit User' }}</h3>
          <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- User preview (edit mode) -->
        <div *ngIf="modalMode() === 'edit'" class="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-6">
          <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
            {{ (editForm.email || '?').charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-semibold text-slate-800">{{ editForm.displayName || 'Unnamed User' }}</p>
            <p class="text-xs text-slate-500">{{ editForm.email }}</p>
          </div>
        </div>

        <div class="space-y-5">

          <!-- Display Name -->
          <div>
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Display Name</label>
            <input type="text" [(ngModel)]="editForm.displayName"
                   class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="Full name">
          </div>

          <!-- Email (add mode only) -->
          <div *ngIf="modalMode() === 'add'">
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Email Address</label>
            <input type="email" [(ngModel)]="editForm.email"
                   class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="user@example.com">
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-bold text-slate-600 uppercase mb-1.5">Account Status</label>
            <select [(ngModel)]="editForm.status"
                    class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        <!-- Error -->
        <p *ngIf="modalError()" class="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{{ modalError() }}</p>

        <!-- Actions -->
        <div class="flex gap-3 mt-7">
          <button (click)="closeModal()"
                  class="flex-1 px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button (click)="saveModal()" [disabled]="modalSaving()"
                  class="flex-1 px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <svg *ngIf="modalSaving()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ modalSaving() ? 'Saving...' : (modalMode() === 'add' ? 'Create User' : 'Save Changes') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .user-row { background-color: white !important; }
    .user-row:hover { background-color: #f8fafc !important; }
    .user-row td { color: #0f172a !important; }
    .user-row .text-slate-500 { color: #64748b !important; }
    .user-row .text-slate-800 { color: #1e293b !important; }
    .user-row .text-emerald-600 { color: #059669 !important; }
    .user-row .text-amber-500  { color: #f59e0b !important; }
    .user-row .text-red-500    { color: #ef4444 !important; }
    .user-row .text-red-600    { color: #dc2626 !important; }
  `]
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService  = inject(AuthService);

  users   = this.adminService.users;
  loading = signal(false);

  searchQuery  = signal('');
  roleFilter   = signal('');
  statusFilter = signal('');

  // Modal state
  showEditModal = signal(false);
  modalMode     = signal<'edit' | 'add'>('edit');
  modalSaving   = signal(false);
  modalError    = signal('');
  editingUserId = signal<string | null>(null);

  editForm: any = { displayName: '', email: '', role: 'User', status: 'Active' };

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    this.loading.set(true);
    await this.adminService.loadUsers();
    this.loading.set(false);
  }

  filteredUsers = computed(() => {
    const currentUser = this.authService.currentUser();
    return this.users().filter(user => {
      // Hide yourself
      if (currentUser && (user.id === currentUser.uid || user.email === currentUser.email)) return false;

      const q = this.searchQuery().toLowerCase();
      const matchesSearch = !q ||
        (user.email || '').toLowerCase().includes(q) ||
        (user.displayName || '').toLowerCase().includes(q);

      const matchesRole   = !this.roleFilter()   || user.role   === this.roleFilter();
      const matchesStatus = !this.statusFilter() || user.status === this.statusFilter();

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  // ── Open edit modal ──
  openEditModal(user: any) {
    this.editingUserId.set(user.id);
    this.editForm = {
      displayName: user.displayName || '',
      email:       user.email || '',
      role:        user.role || 'User',
      status:      user.status || 'Active'
    };
    this.modalMode.set('edit');
    this.modalError.set('');
    this.showEditModal.set(true);
  }

  // ── Open add modal ──
  openAddModal() {
    this.editingUserId.set(null);
    this.editForm = { displayName: '', email: '', role: 'User', status: 'Active' };
    this.modalMode.set('add');
    this.modalError.set('');
    this.showEditModal.set(true);
  }

  closeModal() {
    this.showEditModal.set(false);
    this.modalError.set('');
    this.modalSaving.set(false);
  }

  // ── Save (edit or add) ──
  async saveModal() {
    if (!this.editForm.displayName.trim()) {
      this.modalError.set('Display name is required.');
      return;
    }
    if (this.modalMode() === 'add' && !this.editForm.email.trim()) {
      this.modalError.set('Email address is required.');
      return;
    }

    this.modalSaving.set(true);
    this.modalError.set('');

    try {
      if (this.modalMode() === 'edit') {
        const uid = this.editingUserId();
        if (!uid) return;
        const ok = await this.adminService.updateUser(uid, {
          displayName: this.editForm.displayName,
          role:        this.editForm.role,
          status:      this.editForm.status
        });
        if (ok) {
          this.closeModal();
          await this.refresh();
        } else {
          this.modalError.set('Failed to update user. Please try again.');
        }
      } else {
        // Add mode — use updateUser to create via admin (simple approach)
        // Backend createUser endpoint is not wired, so inform admin to invite via Firebase Console
        this.modalError.set('To add a new user, please have them sign up via the app or use Firebase Console. Role can be assigned here after.');
        this.modalSaving.set(false);
        return;
      }
    } catch (e: any) {
      this.modalError.set(e?.message || 'An error occurred.');
    }

    this.modalSaving.set(false);
  }

  // ── Delete ──
  async onDelete(user: any) {
    if (!confirm(`Delete user "${user.displayName || user.email}"?\n\nThis will remove their profile from the system. This action cannot be undone.`)) return;
    const ok = await this.adminService.deleteUser(user.id);
    if (ok) {
      await this.refresh();
    } else {
      alert('Failed to delete user. Please try again.');
    }
  }

  // ── Unlock ──
  async onUnlock(user: any) {
    if (!confirm(`Unlock "${user.displayName || user.email}"? They will be able to attempt login immediately.`)) return;
    const ok = await this.adminService.unlockUser(user.id);
    if (ok) {
      await this.refresh();
    } else {
      alert('Failed to unlock user.');
    }
  }
}
