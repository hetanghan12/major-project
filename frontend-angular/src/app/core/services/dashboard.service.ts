import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, shareReplay, catchError, firstValueFrom, tap, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Unified Dashboard Data Interface
 */
export interface UnifiedDashboardData {
    success: boolean;
    stats: {
        totalFiles: number;
        totalStorageUsed: number;
        storageLimit: number;
        percentUsed: number;
        starredCount: number;
        sharedCount: number;
        aiTasksCount: number;
    };
    recentDocuments: any[];
    typeDistribution: {
        documents: { count: number; bytes: number };
        media: { count: number; bytes: number };
        others: { count: number; bytes: number };
    };
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/secure/documents/dashboard`;

    // Reactive state for the entire dashboard
    private _dashboardData = signal<UnifiedDashboardData | null>(null);
    private _isLoading = signal<boolean>(false);
    private dashboardCache$?: Observable<UnifiedDashboardData>;

    // Public views
    readonly dashboardData = computed(() => this._dashboardData());
    readonly isLoading = computed(() => this._isLoading());

    /**
     * Fetch unified dashboard data.
     * Returns a shared observable with shareReplay(1) to ensure 
     * multiple subscribers within a session don't trigger multiple calls.
     */
    getUnifiedDashboard(forceRefresh = false): Observable<UnifiedDashboardData> {
        // If not forcing refresh and we have an active observable, return it
        if (!forceRefresh && this.dashboardCache$) {
            return this.dashboardCache$;
        }

        this._isLoading.set(true);

        this.dashboardCache$ = this.http.get<UnifiedDashboardData>(this.apiUrl).pipe(
            tap(data => {
                if (data && data.success) {
                    this._dashboardData.set(data);
                }
                this._isLoading.set(false);
            }),
            shareReplay(1),
            catchError(err => {
                console.error('Dashboard Fetch failed:', err);
                this._isLoading.set(false);
                this.dashboardCache$ = undefined;
                return of({ success: false } as UnifiedDashboardData);
            })
        );

        return this.dashboardCache$;
    }

    /**
     * Helper to invalidate the client-side cache
     */
    refreshDashboard(): void {
        this.getUnifiedDashboard(true).subscribe();
    }

    /**
     * Promise-based helper for components that prefer await
     */
    async getDashboardAsync(forceRefresh = false): Promise<UnifiedDashboardData> {
        return firstValueFrom(this.getUnifiedDashboard(forceRefresh));
    }
}
