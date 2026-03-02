/**
 * AI Usage Component
 * ==================
 * Tracks system-wide AI model performance and token consumption.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-ai-usage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-usage">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">AI Assistant Usage</h2>
          <p class="text-slate-500 text-sm mt-1">System-wide AI model performance and token consumption</p>
        </div>
        <button class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
          </svg>
          Configure Models
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="card p-12 text-center text-slate-400">
        <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading AI usage metrics...</p>
      </div>

      <!-- Real Data Content -->
      <ng-container *ngIf="!loading() && adminService.aiMetrics() && (adminService.aiMetrics()?.stats?.totalCalls || 0) > 0">
        
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="card p-6 bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total AI Calls</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ adminService.aiMetrics()?.stats?.totalCalls || 0 }}</h3>
            <p class="text-xs text-green-600 mt-2 font-medium">Real-time usage logged</p>
          </div>
          <div class="card p-6 bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tokens Consumed</p>
            <h3 class="text-2xl font-bold text-slate-900">{{ adminService.aiMetrics()?.stats?.totalTokens || 0 }}</h3>
            <p class="text-xs text-indigo-600 mt-2 font-medium">Across all models</p>
          </div>
          <div class="card p-6 bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Cost</p>
            <h3 class="text-2xl font-bold text-slate-900">$ {{ adminService.aiMetrics()?.stats?.totalCost || 0 }}</h3>
            <p class="text-xs text-amber-600 mt-2 font-medium">USD Based on current rates</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Breakdown -->
          <div class="lg:col-span-1 card p-6 bg-white border border-slate-100 shadow-sm">
            <h3 class="font-bold text-slate-900 mb-6">Usage Breakdown</h3>
            <div class="space-y-6">
              <div *ngFor="let item of adminService.aiMetrics()?.breakdown" class="space-y-2">
                <div class="flex justify-between text-sm font-medium">
                  <span class="text-slate-600">{{ item.category }}</span>
                  <span class="text-slate-900">{{ item.value }}%</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-indigo-500" [style.width.%]="item.value"></div>
                </div>
              </div>
              <div *ngIf="!adminService.aiMetrics()?.breakdown?.length" class="text-center py-8 text-slate-400 text-sm">
                No activity to categorize yet.
              </div>
            </div>
          </div>

          <!-- Model Performance -->
          <div class="lg:col-span-2 card p-0 bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-50">
              <h3 class="font-bold text-slate-900">Active Model Monitoring</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-3">Model Name</th>
                    <th class="px-6 py-3">Calls</th>
                    <th class="px-6 py-3">Tokens</th>
                    <th class="px-6 py-3">Estimated Cost</th>
                    <th class="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr *ngFor="let model of adminService.aiMetrics()?.models" class="hover:bg-slate-50/30 transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-900">{{ model.name }}</td>
                    <td class="px-6 py-4 text-slate-600 text-sm">{{ model.calls }}</td>
                    <td class="px-6 py-4 text-slate-600 text-sm">{{ model.tokens }}</td>
                    <td class="px-6 py-4 text-slate-600 text-sm">$ {{ model.cost }}</td>
                    <td class="px-6 py-4">
                      <span class="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {{ model.status }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="!adminService.aiMetrics()?.models?.length">
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400 text-sm">
                      Waiting for AI model activity logs...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Empty state when no metrics at all -->
      <div *ngIf="!loading() && (!adminService.aiMetrics() || (adminService.aiMetrics()?.stats?.totalCalls || 0) === 0)" 
           class="card p-12 text-center text-slate-400 bg-white shadow-sm border border-slate-100">
        <div class="ai-assistant-btn w-fit mx-auto mb-4 pointer-events-none opacity-50">
          <svg class="w-8 h-8 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <p class="font-medium text-slate-900">AI Logging Active</p>
        <p class="text-sm mt-1">The system is now configured to record real AI usage. Real-time consumption will appear here as soon as users interact with the assistant.</p>
        <div class="mt-6">
          <button (click)="load()" class="btn-primary text-sm px-6">Refresh Metrics</button>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AIUsageComponent implements OnInit {
  public adminService = inject(AdminService);
  loading = signal(true);

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    console.log('[AIUsage] Fetching metrics from API...');
    try {
      const stats = await this.adminService.loadAIMetrics();
      console.log('[AIUsage] API Response stats:', stats);
    } catch (e) {
      console.error('[AIUsage] Fetch failed:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
