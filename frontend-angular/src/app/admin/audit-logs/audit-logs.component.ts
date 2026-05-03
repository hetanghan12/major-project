import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../core/services/admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-audit-logs',
  imports: [CommonModule],
  template: `
    <div class="header">
      <h1>Audit Logs</h1>
      <p>Security and activity tracking (Last 50 events)</p>
    </div>

    <div class="table-container">
      <table *ngIf="!loading; else spinner">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Event</th>
            <th>User / Email</th>
            <th>IP Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let log of logs">
            <td class="meta">{{ log.timestamp | date:'short' }}</td>
            <td>
              <span class="event-badge" [class]="getEventClass(log.event)">{{ log.event }}</span>
            </td>
            <td>
              <strong>{{ log.user }}</strong>
              <div class="meta-small">{{ log.userId || 'System' }}</div>
            </td>
            <td class="meta">{{ log.ipAddress || 'Unknown' }}</td>
            <td>
              <span class="status-badge" [ngClass]="log.status === 'Success' ? 'success' : 'failed'">
                {{ log.status }}
              </span>
            </td>
          </tr>
          <tr *ngIf="logs.length === 0">
            <td colspan="5" class="empty-state">No audit logs found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ng-template #spinner>
      <div class="spinner-container">
        <div class="spinner"></div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; color: #1f2937; }
    .header p { color: #6b7280; font-size: 15px; margin: 0 0 2rem; }

    .table-container { background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 1rem 1.5rem; font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; background: #f9fafb; white-space: nowrap; }
    td { padding: 1rem 1.5rem; vertical-align: middle; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background-color: #f8fafc; }
    
    .event-badge { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #f3f4f6; color: #4b5563; }
    .event-badge.auth { background: #e0e7ff; color: #4338ca; }
    .event-badge.sys { background: #fce7f3; color: #be185d; }
    .event-badge.sec { background: #ffedd5; color: #c2410c; }
    
    .status-badge { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .status-badge.success { background: #d1fae5; color: #047857; }
    .status-badge.failed { background: #fee2e2; color: #b91c1c; }

    .meta { color: #6b7280; font-variant-numeric: tabular-nums; }
    .meta-small { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .empty-state { text-align: center; color: #6b7280; padding: 2rem !important; }

    .spinner-container { display: flex; justify-content: center; padding: 4rem; }
    .spinner { border: 4px solid rgba(0,0,0,0.1); border-left-color: #6366f1; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  `]
})
export class AdminAuditLogsComponent implements OnInit {
  private adminService = inject(AdminService);
  logs: any[] = [];
  loading = true;

  ngOnInit() {
    this.loadLogs();
  }

  async loadLogs() {
    try {
      this.loading = true;
      const res = await this.adminService.getAuditLogs();
      this.logs = res.data || [];
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      this.loading = false;
    }
  }

  getEventClass(event: string) {
    if (event.includes('LOGIN') || event.includes('USER')) return 'auth';
    if (event.includes('SETTING') || event.includes('DELETE')) return 'sys';
    if (event.includes('LOCK') || event.includes('UNLOCK')) return 'sec';
    return '';
  }
}
