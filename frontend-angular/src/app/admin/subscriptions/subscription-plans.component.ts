/**
 * Subscription Plans Component
 * ============================
 * Displays and manages system-wide pricing plans.
 * Edit Plan button opens an inline modal to update the plan and save to Firestore.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="subscription-plans">
      <div class="flex justify-between items-center mb-10">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Subscription Plans</h2>
          <p class="text-slate-500 text-sm mt-1">Manage pricing tiers and feature limits</p>
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div *ngFor="let plan of adminService.plans()"
             class="card bg-white p-8 flex flex-col relative overflow-hidden shadow-sm border transition-shadow hover:shadow-md"
             [class.border-indigo-500]="plan.isPopular"
             [class.border-2]="plan.isPopular"
             [class.border-slate-100]="!plan.isPopular">

          <!-- Most Popular Badge -->
          <div *ngIf="plan.isPopular" class="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
            Most Popular
          </div>

          <!-- Plan Header -->
          <div class="mb-4">
            <h3 class="text-lg font-bold text-slate-900">{{ plan.name }}</h3>
            <p class="text-slate-500 text-sm mt-1">{{ plan.description }}</p>
          </div>

          <!-- Price -->
          <div class="mb-8">
            <span class="text-4xl font-black text-slate-900">
              {{ plan.price === 0 ? 'Free' : ('₹' + plan.price) }}
            </span>
            <span *ngIf="plan.price > 0" class="text-slate-400">/month</span>
          </div>

          <!-- Features -->
          <ul class="space-y-3 mb-10 flex-1">
            <li *ngFor="let feature of plan.features" class="flex items-center gap-3 text-sm text-slate-600">
              <svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ feature }}
            </li>
          </ul>

          <!-- Edit Button -->
          <button (click)="openEdit(plan)"
                  class="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                  [class.bg-indigo-600]="plan.isPopular"
                  [class.text-white]="plan.isPopular"
                  [class.hover:bg-indigo-700]="plan.isPopular"
                  [class.border]="!plan.isPopular"
                  [class.border-indigo-200]="!plan.isPopular"
                  [class.text-indigo-600]="!plan.isPopular"
                  [class.hover:bg-indigo-50]="!plan.isPopular">
            Edit Plan
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════ EDIT MODAL ══════════════════════ -->
    <div *ngIf="editingPlan()" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.5);">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <!-- Modal Header -->
        <div class="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h3 class="text-xl font-bold text-slate-900">Edit Plan</h3>
            <p class="text-slate-400 text-sm mt-0.5">{{ editingPlan()!.name }}</p>
          </div>
          <button (click)="closeEdit()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-8 py-6 space-y-5">
          <!-- Name -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Plan Name</label>
            <input [(ngModel)]="form.name" type="text" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="e.g. Professional">
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <input [(ngModel)]="form.description" type="text" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Short plan description">
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Price (INR)</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input [(ngModel)]="form.price" type="number" min="0" class="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0">
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Set to 0 for a free plan</p>
          </div>

          <!-- Features -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Features (one per line)</label>
            <textarea [(ngModel)]="featuresText" rows="6"
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
              placeholder="5 GB Storage
Basic AI Assistant
Email Support"></textarea>
            <p class="text-[11px] text-slate-400 mt-1">{{ featuresCount() }} features</p>
          </div>

          <!-- Popular Toggle -->
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p class="text-sm font-semibold text-slate-700">Mark as Most Popular</p>
              <p class="text-xs text-slate-400 mt-0.5">Highlights this plan with a badge</p>
            </div>
            <button (click)="form.isPopular = !form.isPopular" type="button"
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    [class.bg-indigo-600]="form.isPopular"
                    [class.bg-slate-200]="!form.isPopular">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                    [class.translate-x-6]="form.isPopular"
                    [class.translate-x-1]="!form.isPopular"></span>
            </button>
          </div>

          <!-- Error -->
          <div *ngIf="saveError()" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{{ saveError() }}</div>
        </div>

        <!-- Modal Footer -->
        <div class="px-8 py-5 border-t border-slate-100 flex gap-3 justify-end">
          <button (click)="closeEdit()" class="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button (click)="savePlan()" [disabled]="saving()"
                  class="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            <svg *ngIf="saving()" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class SubscriptionPlansComponent implements OnInit {
  adminService  = inject(AdminService);
  editingPlan   = signal<any>(null);
  saving        = signal(false);
  saveError     = signal('');
  featuresText  = '';

  form: any = {};

  async ngOnInit() {
    await this.adminService.loadPlans();
  }

  featuresCount(): number {
    return this.featuresText.split('\n').filter((f: string) => f.trim().length > 0).length;
  }

  openEdit(plan: any) {
    this.editingPlan.set(plan);
    this.form = {
      name:        plan.name,
      description: plan.description,
      price:       plan.price,
      isPopular:   plan.isPopular,
    };
    this.featuresText = (plan.features || []).join('\n');
    this.saveError.set('');
  }

  closeEdit() {
    this.editingPlan.set(null);
    this.saving.set(false);
    this.saveError.set('');
  }

  async savePlan() {
    this.saving.set(true);
    this.saveError.set('');

    const features = this.featuresText
      .split('\n')
      .map((f: string) => f.trim())
      .filter((f: string) => f.length > 0);

    const success = await this.adminService.updatePlan(this.editingPlan()!.id, {
      ...this.form,
      features
    });

    this.saving.set(false);
    if (success) {
      this.closeEdit();
    } else {
      this.saveError.set('Failed to save. Please try again.');
    }
  }
}
