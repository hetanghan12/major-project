import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-ai-usage',
  imports: [CommonModule],
  template: `
    <div class="h-full w-full flex flex-col" *ngIf="!loading && stats">
      <!-- PAGE HEADER -->
      <div class="flex justify-between items-start mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">AI Assistant Usage</h1>
          <p class="text-sm text-gray-500 mt-1">System-wide AI model performance and token consumption</p>
        </div>
        <button (click)="loadData()" [disabled]="refreshing" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          {{ refreshing ? 'Refreshing...' : 'Refresh Logs' }}
        </button>
      </div>

      <!-- METRICS GRID -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Calls Card -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 relative z-10">Total AI Calls</h3>
          <div class="text-3xl font-bold text-gray-900 mb-2 relative z-10">{{ stats.totalCalls || 0 }}</div>
          <div class="text-xs font-semibold text-emerald-500 relative z-10">Real-time usage logged</div>
        </div>

        <!-- Tokens Card -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tokens Consumed</h3>
          <div class="text-3xl font-bold text-gray-900 mb-2">{{ formatTokens(stats.totalTokens || 0) }}</div>
          <div class="text-xs font-medium text-indigo-500">Across all models</div>
        </div>

        <!-- Cost Card -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated Cost</h3>
          <div class="text-3xl font-bold text-gray-900 mb-2">$ {{ stats.totalCostUSD || '0.00' }}</div>
          <div class="text-xs font-medium text-amber-500">USD Based on current rates</div>
        </div>
      </div>

      <!-- LOWER CONTAINERS -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        <!-- Usage Breakdown (Left Column) -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col col-span-1">
          <h3 class="text-sm font-bold text-gray-900 mb-6">Usage Breakdown</h3>
          
          <div class="flex-1 space-y-6 overflow-y-auto">
            <!-- Breakdown 1 -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                <span>EMBEDDING & PROCESSING</span>
                <span>{{ getPercentage(stats.totalEmbedTokens, stats.totalTokens) }}%</span>
              </div>
              <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.totalEmbedTokens, stats.totalTokens)"></div>
              </div>
            </div>

            <!-- Breakdown 2 -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                <span>CHAT</span>
                <span>{{ getPercentage(stats.totalChatTokens, stats.totalTokens) }}%</span>
              </div>
              <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" [style.width.%]="getPercentage(stats.totalChatTokens, stats.totalTokens)"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Models Table (Right Column) -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 col-span-2 flex flex-col overflow-hidden">
          <div class="p-6 border-b border-gray-100">
            <h3 class="text-sm font-bold text-gray-900">Active Model Monitoring</h3>
          </div>
          
          <div class="flex-1 overflow-x-auto overflow-y-auto">
            <table class="w-full text-left whitespace-nowrap">
              <thead class="bg-white sticky top-0 border-b border-gray-100 z-10">
                <tr>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Model Name</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Calls</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tokens</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimated Cost</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                
                <tr *ngFor="let model of stats.activeModels" class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm font-bold text-gray-900">{{ model.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600 font-medium">{{ model.calls }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600 font-medium">{{ formatTokens(model.tokens) }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600 font-medium">$ {{ (model.estimatedCost || 0).toFixed(4) }}</td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded">
                      {{ model.status }}
                    </span>
                  </td>
                </tr>

                <tr *ngIf="!stats.activeModels?.length">
                  <td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">No active model usage logged yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    
    <!-- Loading State -->
    <div *ngIf="loading" class="h-full w-full flex items-center justify-center">
      <svg class="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AiUsageComponent implements OnInit {
  private adminService = inject(AdminService);
  stats: any = null;
  loading = true;
  refreshing = false;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.refreshing = true;
    try {
      const res = await this.adminService.getAiUsageMetrics();
      if (res.success) {
        this.stats = res.data;
      }
    } catch (e) {
      console.error('Failed to load AI usage metrics', e);
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  formatTokens(tokens: number) {
    if (!tokens) return '0';
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + 'M';
    if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'K';
    return tokens.toString();
  }

  getPercentage(part: number, total: number) {
    if (!total || total === 0) return 0;
    return Math.round((part / total) * 100);
  }
}
