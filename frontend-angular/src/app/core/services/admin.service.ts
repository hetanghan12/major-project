import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, shareReplay, catchError, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface AdminApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/admin`;

    // Cache observable for unified dashboard to prevent duplicate calls
    private dashboardCache$?: Observable<AdminApiResponse>;
    private lastFetchTime = 0;
    private readonly CACHE_DURATION = 30000; // 30 seconds client-side cache

    private async getHeaders() {
        const token = await this.authService.getToken();
        return {
            Authorization: `Bearer ${token}`
        };
    }

    /**
     * Fetch unified dashboard data.
     * Uses shareReplay(1) and a TTL to ensure only one HTTP call is made within a window,
     * even if multiple components subscribe or the user navigates back and forth.
     */
    async getUnifiedDashboardData(forceRefresh = false): Promise<AdminApiResponse> {
        const now = Date.now();

        if (!forceRefresh && this.dashboardCache$ && (now - this.lastFetchTime < this.CACHE_DURATION)) {
            return firstValueFrom(this.dashboardCache$);
        }

        this.lastFetchTime = now;
        this.dashboardCache$ = this.http.get<AdminApiResponse>(`${this.apiUrl}/dashboard-data`).pipe(
            shareReplay(1),
            catchError(err => {
                this.dashboardCache$ = undefined;
                this.lastFetchTime = 0;
                throw err;
            })
        );

        return firstValueFrom(this.dashboardCache$);
    }

    async getDashboardStatsLegacy(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/dashboard/stats`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async getDashboardStats(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/dashboard/stats`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async getAnalytics(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/analytics`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    // 2. User Management
    async getUsers(page: number = 1, limit: number = 10): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/users?page=${page}&limit=${limit}`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async updateUser(userId: string, data: any): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.put<AdminApiResponse>(`${this.apiUrl}/users/${userId}`, data, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async deleteUser(userId: string): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.delete<AdminApiResponse>(`${this.apiUrl}/users/${userId}`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async unlockUser(userId: string): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.post<AdminApiResponse>(`${this.apiUrl}/users/${userId}/unlock`, {}, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    // 3. Application Config & Auditing
    async getAuditLogs(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/audit-logs`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async getSettings(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/settings`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async updateSettings(settings: any): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.put<AdminApiResponse>(`${this.apiUrl}/settings`, settings, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    // 4. Monetization & Usage
    async getSubscriptions(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/subscriptions`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async updateSubscription(planId: string, data: any): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.put<AdminApiResponse>(`${this.apiUrl}/subscriptions/${planId}`, data, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async getAiUsageMetrics(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        return this.http.get<AdminApiResponse>(`${this.apiUrl}/ai-usage/metrics`, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    // New Analytics Endpoints
    async getDashboardAnalytics(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        const url = `${environment.apiUrl}/analytics/dashboard`;
        return this.http.get<AdminApiResponse>(url, { headers }).toPromise() as Promise<AdminApiResponse>;
    }

    async getStorageActivity(): Promise<AdminApiResponse> {
        const headers = await this.getHeaders();
        const url = `${environment.apiUrl}/analytics/storage-activity`;
        return this.http.get<AdminApiResponse>(url, { headers }).toPromise() as Promise<AdminApiResponse>;
    }
}
