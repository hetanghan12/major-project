import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full w-full flex flex-col">
      <!-- PAGE HEADER -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="text-sm text-gray-500 mt-1">{{ users.length }} of {{ users.length }} users shown</p>
        </div>
        <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add New User
        </button>
      </div>

      <!-- FILTER BAR -->
      <div class="flex justify-between items-center mb-6 gap-4">
        <!-- Search Input -->
        <div class="relative w-full max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Search by name or email..." 
            class="pl-10 block w-full rounded-xl border-gray-200 border text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 py-2 shadow-sm"
          >
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-3">
          <select class="rounded-xl border-gray-200 border text-sm text-gray-700 py-2 pl-3 pr-8 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer bg-white">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
          <button (click)="loadUsers()" [disabled]="loading" class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors shadow-sm bg-white" title="Refresh">
            <svg class="w-5 h-5" [class.animate-spin]="loading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- TABLE CONTAINER -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 overflow-y-auto min-h-0">
        <table class="w-full whitespace-nowrap text-left" *ngIf="!loading; else spinner">
          <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 sticky top-0 border-b border-gray-200 z-10">
            <tr>
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Role</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Joined</th>
              <th class="px-6 py-4">Last Login</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr *ngFor="let user of filteredUsers" class="hover:bg-gray-50 transition-colors group">
              <!-- USER COLUMN -->
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-lg" [ngClass]="getAvatarColorClass(user.displayName || user.email)">
                    {{ (user.displayName || user.email || 'U')[0].toUpperCase() }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.displayName || 'Unnamed User' }} <span *ngIf="user.isLocked" class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Locked</span></div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              
              <!-- ROLE COLUMN -->
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {{ user.role || 'User' }}
                </span>
                <!-- Kept the select visually hidden but usable to preserve logic, or just make it standard text. We use text layout first -->
              </td>
              
              <!-- STATUS COLUMN -->
              <td class="px-6 py-4">
                <div class="flex items-center text-sm font-medium" [ngClass]="user.status === 'Suspended' ? 'text-red-600' : 'text-emerald-600'">
                  <span class="h-2 w-2 rounded-full mr-2" [ngClass]="user.status === 'Suspended' ? 'bg-red-500' : 'bg-emerald-500'"></span>
                  {{ user.status || 'Active' }}
                </div>
              </td>
              
              <!-- JOINED COLUMN -->
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ user.createdAt | date:'mediumDate' }}
              </td>
              
              <!-- LAST LOGIN COLUMN -->
              <td class="px-6 py-4 text-sm text-gray-500">
                 {{ (user.lastLoginAt | date:'mediumDate') || 'Never' }}
              </td>
              
              <!-- ACTIONS COLUMN -->
              <td class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button *ngIf="user.isLocked" (click)="unlockUser(user)" class="text-emerald-600 hover:text-emerald-900 transition-colors" title="Unlock User">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                  </button>
                  <button (click)="editUser(user)" class="text-gray-400 hover:text-indigo-600 transition-colors" title="Edit User">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button (click)="deleteUser(user)" class="text-gray-400 hover:text-red-600 transition-colors" title="Delete User">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            
            <tr *ngIf="filteredUsers.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <svg class="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                  <p class="text-sm font-medium text-gray-900">No users found</p>
                  <p class="text-sm text-gray-500">Try adjusting your search or filters.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ng-template #spinner>
      <div class="flex justify-center items-center h-64">
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
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  users: any[] = [];
  loading = true;
  searchQuery = '';

  ngOnInit() {
    this.loadUsers();
  }

  get filteredUsers() {
    if (!this.searchQuery) return this.users;
    const lowerQ = this.searchQuery.toLowerCase();
    return this.users.filter(u =>
      (u.displayName?.toLowerCase().includes(lowerQ)) ||
      (u.email?.toLowerCase().includes(lowerQ))
    );
  }

  async loadUsers() {
    try {
      this.loading = true;
      const response = await this.adminService.getUsers(1, 100);
      this.users = response.data || [];
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      this.loading = false;
    }
  }

  editUser(user: any) {
    // In a real implementation this would open a modal to edit
    // For now we just cycle the role to demonstrate functionality
    const nextRole = user.role === 'Admin' ? 'User' : (user.role === 'Editor' ? 'Admin' : 'Editor');
    user.role = nextRole;
    this.updateUser(user);
  }

  async updateUser(user: any) {
    try {
      await this.adminService.updateUser(user.uid, { role: user.role, status: user.status });
    } catch (err) {
      console.error('Update failed', err);
      // Revert in real implementation
    }
  }

  async unlockUser(user: any) {
    if (!confirm('Unlock account for ' + user.email + '?')) return;
    try {
      await this.adminService.unlockUser(user.uid);
      user.isLocked = false;
    } catch (err) {
      console.error('Unlock failed', err);
    }
  }

  async deleteUser(user: any) {
    if (!confirm('Are you sure you want to completely DELETE ' + user.email + '? This action is irreversible.')) return;
    try {
      await this.adminService.deleteUser(user.uid);
      this.users = this.users.filter(u => u.uid !== user.uid);
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete user');
    }
  }

  getAvatarColorClass(name: string): string {
    const firstLetter = (name || 'U').charAt(0).toUpperCase();

    // Stripe/Supabase style specific letter mappings
    if (['A', 'B', 'C', 'D'].includes(firstLetter)) return 'bg-purple-100 text-purple-700';
    if (['E', 'F', 'G', 'H'].includes(firstLetter)) return 'bg-pink-100 text-pink-700';
    if (['I', 'J', 'K', 'L'].includes(firstLetter)) return 'bg-indigo-100 text-indigo-700';
    if (['M', 'N', 'O', 'P'].includes(firstLetter)) return 'bg-blue-100 text-blue-700';
    if (['Q', 'R', 'S', 'T'].includes(firstLetter)) return 'bg-emerald-100 text-emerald-700';
    if (['U', 'V', 'W', 'X'].includes(firstLetter)) return 'bg-orange-100 text-orange-700';

    // Default
    return 'bg-gray-100 text-gray-700';
  }
}
