import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';

interface PlanData {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  limits?: { storage: number };
  isPopular?: boolean;
  order?: number;
  updatedAt?: string;
}

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plans-page">
      <!-- PAGE HEADER -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Subscription Plans</h1>
          <p class="page-subtitle">Manage pricing tiers and feature limits</p>
        </div>
        <button (click)="loadData()" [disabled]="refreshing" class="btn btn-outline">
          <svg *ngIf="!refreshing" class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <svg *ngIf="refreshing" class="btn-icon spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ refreshing ? 'Refreshing...' : 'Refresh Plans' }}
        </button>
      </div>

      <!-- INFO BANNER -->
      <div class="info-banner" *ngIf="!loading && plans.length">
        <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>Plans are stored in Firestore under <strong>subscription_plans</strong> collection. Changes are reflected instantly for all users.</span>
      </div>

      <!-- PLANS GRID -->
      <div class="plans-grid" *ngIf="!loading">
        <div *ngFor="let plan of plans; let i = index"
             class="plan-card"
             [class.popular]="plan.isPopular">

          <!-- Popular badge -->
          <div class="popular-badge" *ngIf="plan.isPopular">
            <svg class="badge-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Most Popular
          </div>

          <div class="plan-content">
            <!-- Plan header -->
            <div class="plan-header">
              <div class="plan-icon" [ngStyle]="{'background': getIconBg(i)}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" [ngStyle]="{'color': getIconColor(i)}">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="getIconPath(i)"/>
                </svg>
              </div>
              <h3 class="plan-name">{{ plan.name || plan.id }}</h3>
              <p class="plan-description">{{ plan.description || 'Basic features for users' }}</p>
            </div>

            <!-- Price -->
            <div class="plan-price">
              <span class="currency" *ngIf="plan.price > 0">₹</span>
              <span class="amount">{{ plan.price > 0 ? plan.price : 'Free' }}</span>
              <span class="period" *ngIf="plan.price > 0">/month</span>
            </div>

            <!-- Features list -->
            <ul class="features-list">
              <li *ngFor="let feature of plan.features" class="feature-item">
                <div class="feature-check">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span>{{ feature }}</span>
              </li>
            </ul>

            <!-- Storage limit info -->
            <div class="storage-info" *ngIf="plan.limits?.storage">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
              </svg>
              <span>{{ formatStorageLimit(plan.limits!.storage) }}</span>
            </div>
          </div>

          <!-- Edit button -->
          <button class="btn-edit" (click)="openEditModal(plan)">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit Plan
          </button>

          <!-- Last updated -->
          <p class="last-updated" *ngIf="plan.updatedAt">
            Updated {{ formatDate(plan.updatedAt) }}
          </p>
        </div>

        <!-- Empty state -->
        <div *ngIf="!plans?.length" class="empty-state">
          <div class="empty-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h3>No subscription plans found</h3>
          <p>Plans will appear here once created in Firestore.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="loading-grid">
          <div *ngFor="let s of [1,2,3]" class="skeleton-card">
            <div class="skeleton-line w-40 h-6 mb-3"></div>
            <div class="skeleton-line w-60 h-4 mb-6"></div>
            <div class="skeleton-line w-32 h-10 mb-6"></div>
            <div *ngFor="let f of [1,2,3]" class="skeleton-line w-full h-4 mb-3"></div>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast" [class.show]="showToast" [class.error]="toastType === 'error'">
        <svg *ngIf="toastType === 'success'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <svg *ngIf="toastType === 'error'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        {{ toastMessage }}
      </div>

      <!-- EDIT MODAL -->
      <div class="modal-overlay" *ngIf="editingPlan" (click)="closeEditModal()">
        <div class="modal-container" (click)="$event.stopPropagation()">
          <!-- Modal header -->
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <div>
                <h2 class="modal-title">Edit Plan</h2>
                <p class="modal-subtitle">Update "{{ editingPlan!.name }}" subscription plan</p>
              </div>
            </div>
            <button class="modal-close" (click)="closeEditModal()">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal body -->
          <div class="modal-body">
            <!-- Plan Name -->
            <div class="form-group">
              <label class="form-label">Plan Name</label>
              <input type="text" class="form-input" [(ngModel)]="editForm.name" placeholder="e.g. Professional" />
            </div>

            <!-- Description -->
            <div class="form-group">
              <label class="form-label">Description</label>
              <input type="text" class="form-input" [(ngModel)]="editForm.description" placeholder="e.g. For power users" />
            </div>

            <!-- Price & Popular -->
            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Price (₹/month)</label>
                <input type="number" class="form-input" [(ngModel)]="editForm.price" min="0" placeholder="0 for Free" />
              </div>
              <div class="form-group">
                <label class="form-label">Popular?</label>
                <label class="toggle-container">
                  <input type="checkbox" [(ngModel)]="editForm.isPopular" class="toggle-input" />
                  <div class="toggle-switch" [class.active]="editForm.isPopular">
                    <div class="toggle-knob"></div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Storage Limit -->
            <div class="form-group">
              <label class="form-label">Storage Limit (GB)</label>
              <input type="number" class="form-input" [(ngModel)]="editForm.storageGB" min="-1" placeholder="-1 for unlimited" />
              <p class="form-hint">Use -1 for unlimited storage</p>
            </div>

            <!-- Display Order -->
            <div class="form-group">
              <label class="form-label">Display Order</label>
              <input type="number" class="form-input" [(ngModel)]="editForm.order" min="0" placeholder="0, 1, 2..." />
              <p class="form-hint">Lower number = displayed first</p>
            </div>

            <!-- Features -->
            <div class="form-group">
              <label class="form-label">Features</label>
              <div class="features-editor">
                <div *ngFor="let feature of editForm.features; let i = index; trackBy: trackByIndex" class="feature-row">
                  <input type="text" class="form-input feature-input" [(ngModel)]="editForm.features[i]" placeholder="Feature description" />
                  <button class="btn-remove-feature" (click)="removeFeature(i)" title="Remove feature">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
                <button class="btn-add-feature" (click)="addFeature()">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Add Feature
                </button>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeEditModal()" [disabled]="saving">Cancel</button>
            <button class="btn btn-primary" (click)="savePlan()" [disabled]="saving || !editForm.name.trim()">
              <svg *ngIf="saving" class="btn-icon spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .plans-page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding-bottom: 24px;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .page-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* Info banner */
    .info-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #1e40af;
    }
    .info-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-outline {
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
    }
    .btn-outline:hover:not(:disabled) {
      background: #f9fafb;
      border-color: #d1d5db;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: none;
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #4338ca);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.45);
      transform: translateY(-1px);
    }
    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* Plans grid */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }

    /* Plan card */
    .plan-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px 28px 24px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .plan-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
      border-color: #d1d5db;
    }
    .plan-card.popular {
      border-color: #6366f1;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12);
    }
    .plan-card.popular:hover {
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.18);
    }

    /* Popular badge */
    .popular-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      letter-spacing: 0.3px;
    }
    .badge-icon {
      width: 12px;
      height: 12px;
    }

    /* Plan content */
    .plan-content {
      flex: 1;
    }
    .plan-header {
      margin-bottom: 24px;
    }
    .plan-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .plan-icon svg {
      width: 24px;
      height: 24px;
    }
    .plan-name {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .plan-description {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
    }

    /* Price */
    .plan-price {
      margin-bottom: 28px;
      display: flex;
      align-items: baseline;
    }
    .currency {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
    }
    .amount {
      font-size: 40px;
      font-weight: 800;
      color: #111827;
      line-height: 1;
    }
    .period {
      font-size: 14px;
      font-weight: 600;
      color: #9ca3af;
      margin-left: 4px;
    }

    /* Features */
    .features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 20px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }
    .feature-check {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ecfdf5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .feature-check svg {
      width: 12px;
      height: 12px;
      color: #10b981;
    }

    /* Storage info */
    .storage-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #9ca3af;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .storage-info svg {
      width: 14px;
      height: 14px;
    }

    /* Edit button */
    .btn-edit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-edit:hover {
      background: #f3f4f6;
      border-color: #6366f1;
      color: #4f46e5;
    }
    .btn-edit svg {
      width: 16px;
      height: 16px;
    }

    .last-updated {
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: 8px;
    }

    /* Empty state */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
    }
    .empty-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: #9ca3af;
    }
    .empty-icon svg {
      width: 28px;
      height: 28px;
    }
    .empty-state h3 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .empty-state p {
      font-size: 14px;
      color: #9ca3af;
    }

    /* Loading skeleton */
    .loading-state {
      flex: 1;
    }
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
    .skeleton-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 32px 28px;
    }
    .skeleton-line {
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
    .w-40 { width: 40%; }
    .w-60 { width: 60%; }
    .w-32 { width: 32%; }
    .w-full { width: 100%; }
    .h-4 { height: 16px; }
    .h-6 { height: 24px; }
    .h-10 { height: 40px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-6 { margin-bottom: 24px; }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: #065f46;
      color: white;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 9999;
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    .toast.error {
      background: #991b1b;
    }
    .toast svg {
      width: 18px;
      height: 18px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
      backdrop-filter: blur(4px);
    }
    .modal-container {
      background: white;
      border-radius: 20px;
      width: 560px;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.25s ease-out;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .modal-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .modal-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff, #e0e7ff);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4f46e5;
    }
    .modal-icon svg {
      width: 22px;
      height: 22px;
    }
    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }
    .modal-subtitle {
      font-size: 13px;
      color: #6b7280;
      margin-top: 2px;
    }
    .modal-close {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }
    .modal-close svg {
      width: 20px;
      height: 20px;
    }

    .modal-body {
      padding: 24px 28px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 16px 28px 24px;
      border-top: 1px solid #f3f4f6;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Form */
    .form-group {
      margin-bottom: 20px;
    }
    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .flex-1 { flex: 1; }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      color: #111827;
      outline: none;
      transition: all 0.2s;
      background: #fafafa;
    }
    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      background: white;
    }
    .form-hint {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }

    /* Toggle */
    .toggle-container {
      display: flex;
      align-items: center;
      cursor: pointer;
      margin-top: 4px;
    }
    .toggle-input {
      display: none;
    }
    .toggle-switch {
      width: 44px;
      height: 24px;
      background: #d1d5db;
      border-radius: 12px;
      position: relative;
      transition: background 0.2s;
    }
    .toggle-switch.active {
      background: #6366f1;
    }
    .toggle-knob {
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .toggle-switch.active .toggle-knob {
      transform: translateX(20px);
    }

    /* Features editor */
    .features-editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .feature-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .feature-input {
      flex: 1;
    }
    .btn-remove-feature {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: none;
      border: 1px solid #fecaca;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .btn-remove-feature:hover {
      background: #fef2f2;
      border-color: #ef4444;
    }
    .btn-remove-feature svg {
      width: 14px;
      height: 14px;
    }
    .btn-add-feature {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border: 1px dashed #d1d5db;
      border-radius: 10px;
      background: none;
      color: #6b7280;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      width: fit-content;
    }
    .btn-add-feature:hover {
      border-color: #6366f1;
      color: #4f46e5;
      background: #eef2ff;
    }
    .btn-add-feature svg {
      width: 16px;
      height: 16px;
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .spin {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class AdminPlansComponent implements OnInit {
  private adminService = inject(AdminService);

  plans: PlanData[] = [];
  loading = true;
  refreshing = false;
  saving = false;

  // Edit modal state
  editingPlan: PlanData | null = null;
  editForm = {
    name: '',
    description: '',
    price: 0,
    features: [] as string[],
    isPopular: false,
    storageGB: 5,
    order: 0
  };

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.refreshing = true;
    try {
      const res = await this.adminService.getSubscriptions();
      if (res.success) {
        this.plans = (res.data || []).sort((a: any, b: any) => {
          // Sort by order if present, then by price desc
          if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
          return (b.price || 0) - (a.price || 0);
        });
      }
    } catch (e) {
      console.error('Failed to load subscription plans', e);
      this.showToastMessage('Failed to load plans', 'error');
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  openEditModal(plan: PlanData) {
    this.editingPlan = plan;
    const storageLimitBytes = plan.limits?.storage || 0;
    this.editForm = {
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      features: [...(plan.features || [])],
      isPopular: plan.isPopular || false,
      storageGB: storageLimitBytes === -1 ? -1 : Math.round(storageLimitBytes / (1024 * 1024 * 1024)),
      order: plan.order ?? 0
    };
  }

  closeEditModal() {
    this.editingPlan = null;
  }

  addFeature() {
    this.editForm.features.push('');
  }

  removeFeature(index: number) {
    this.editForm.features.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async savePlan() {
    if (!this.editingPlan || !this.editForm.name?.trim()) return;

    this.saving = true;
    try {
      // Build the data to send
      const filteredFeatures = this.editForm.features.filter(f => f.trim() !== '');
      const storageBytes = this.editForm.storageGB === -1
        ? -1
        : this.editForm.storageGB * 1024 * 1024 * 1024;

      const updateData = {
        name: this.editForm.name.trim(),
        description: this.editForm.description.trim(),
        price: Number(this.editForm.price) || 0,
        features: filteredFeatures,
        isPopular: this.editForm.isPopular,
        order: Number(this.editForm.order) || 0,
        limits: {
          storage: storageBytes
        }
      };

      const res = await this.adminService.updateSubscription(this.editingPlan.id, updateData);
      if (res.success) {
        this.showToastMessage('Plan updated successfully!', 'success');
        this.closeEditModal();
        await this.loadData(); // Refresh from Firestore
      } else {
        this.showToastMessage(res.message || 'Failed to update plan', 'error');
      }
    } catch (e: any) {
      console.error('Failed to save plan:', e);
      this.showToastMessage(e.message || 'Failed to save changes', 'error');
    } finally {
      this.saving = false;
    }
  }

  showToastMessage(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3500);
  }

  // Helpers
  formatStorageLimit(bytes: number): string {
    if (bytes === -1) return 'Unlimited Storage';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1024) return `${(gb / 1024).toFixed(0)} TB Storage Limit`;
    return `${gb.toFixed(0)} GB Storage Limit`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getIconBg(i: number): string {
    const bgs = ['#eef2ff', '#fef3c7', '#ecfdf5'];
    return bgs[i % bgs.length];
  }

  getIconColor(i: number): string {
    const colors = ['#4f46e5', '#d97706', '#059669'];
    return colors[i % colors.length];
  }

  getIconPath(i: number): string {
    const paths = [
      'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', // sparkle
      'M13 10V3L4 14h7v7l9-11h-7z', // lightning bolt
      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' // book
    ];
    return paths[i % paths.length];
  }
}
