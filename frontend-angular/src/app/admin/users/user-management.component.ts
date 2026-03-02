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
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold">User Management</h2>
        <button class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Add New User
        </button>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div class="relative flex-1 min-w-[300px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
        
        <div class="flex gap-4">
          <select class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800" 
                  [ngModel]="roleFilter()"
                  (ngModelChange)="roleFilter.set($event)">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Editor">Editor</option>
            <option value="User">User</option>
          </select>
          
          <select class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800" 
                  [ngModel]="statusFilter()"
                  (ngModelChange)="statusFilter.set($event)">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th class="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">User</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Role</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Status</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Joined Date</th>
              <th class="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr *ngFor="let user of filteredUsers()" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    {{ user.email.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-medium">{{ user.displayName || 'Unnamed User' }}</p>
                    <p class="text-xs text-gray-500">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium" [ngClass]="{
                  'bg-indigo-100 text-indigo-700': user.role === 'Admin',
                  'bg-blue-100 text-blue-700': user.role === 'Editor',
                  'bg-gray-100 text-gray-700': user.role === 'User' || !user.role
                }">
                  {{ user.role || 'User' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="flex items-center gap-1.5 text-xs font-medium" [ngClass]="{
                  'text-green-500': user.status === 'Active' || !user.status,
                  'text-red-500': user.status === 'Deactivated'
                }">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ user.status || 'Active' }}
                </span>
                <!-- Lockout Status -->
                <div *ngIf="user.lockout?.isLocked" class="mt-1 flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-fit">
                  <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zM7 7a3 3 0 116 0v2H7V7z"/></svg>
                  LOCKED
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ user.createdAt | date:'mediumDate' }}
              </td>
              <td class="px-6 py-4 text-right">
                  <button *ngIf="user.lockout?.isLocked" (click)="onUnlock(user.id)" class="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-500 hover:text-emerald-700 transition-colors" title="Unlock User">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                    </svg>
                  </button>
                  <button class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 hover:text-red-600 transition-colors" title="Delete" (click)="onDelete(user.id)">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="!filteredUsers()?.length">
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">
                <p class="mb-2">No users found matching your search.</p>
                <p class="text-xs">Note: You are currently hidden from this list to prevent accidental self-modifications.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService  = inject(AuthService);
  users = this.adminService.users;

  searchQuery = signal('');
  roleFilter = signal('');
  statusFilter = signal('');

  async ngOnInit() {
    console.log('[UserManagement] Initializing and loading users...');
    await this.adminService.loadUsers();
    console.log('[UserManagement] Loaded users count:', this.users().length);
  }

  filteredUsers = computed(() => {
    const currentUser = this.authService.currentUser();
    const allUsers = this.users();
    
    return allUsers.filter(user => {
      // Don't show the currently logged-in admin in their own management list
      if (currentUser && (user.id === currentUser.uid || user.email === currentUser.email)) {
        return false;
      }

      const query = this.searchQuery().toLowerCase();
      const matchesSearch = !query || 
        user.email.toLowerCase().includes(query) ||
        (user.displayName && user.displayName.toLowerCase().includes(query));
      
      const roleFilter = this.roleFilter();
      const statusFilter = this.statusFilter();

      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  async onDelete(userId: string) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const success = await this.adminService.deleteUser(userId);
      if (success) {
        this.adminService.loadUsers();
      }
    }
  }

  async onUnlock(userId: string) {
    if (confirm('Manually unlock this user? They will be able to attempt login immediately.')) {
      const success = await this.adminService.unlockUser(userId);
      if (success) {
        this.adminService.loadUsers();
      }
    }
  }
}
