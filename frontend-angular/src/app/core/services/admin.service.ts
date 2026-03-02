/**
 * Admin Service
 * =============
 * Handles all system-wide administrative API calls.
 * Every method handles errors gracefully and populates signals
 * even on failure (with sensible fallback data) so the UI
 * never gets stuck on "Loading...".
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/admin`;

    // --- Reactive State Signals ---
    stats    = signal<any>(null);
    users    = signal<any[]>([]);
    logs     = signal<any[]>([]);
    settings = signal<any>(null);
    plans    = signal<any[]>([]);
    aiMetrics = signal<any>(null);
    analytics = signal<any>(null);

    // -------------------------------------------------------------------------
    // Analytics
    // -------------------------------------------------------------------------
    async loadAnalytics(): Promise<any> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/analytics`)
            );
            if (response?.success) {
                this.analytics.set(response.analytics);
                return response.analytics;
            }
        } catch (error: any) {
            console.error('[AdminService] loadAnalytics error:', error?.error?.message || error?.message);
            this.analytics.set(this._emptyAnalytics());
        }
    }

    private _emptyAnalytics() {
        return {
            totalUsers: 0,
            totalFiles: 0,
            totalStorage: 0,
            userGrowth: [0, 0, 0, 0, 0, 0, 0],
            fileActivity: [0, 0, 0, 0, 0, 0, 0],
            typeDistribution: { images: 0, videos: 0, documents: 0, audio: 0, other: 0 },
            dau: 0,
            weeklyEvents: [0, 0, 0, 0, 0, 0, 0]
        };
    }

    // -------------------------------------------------------------------------
    // Dashboard Stats
    // -------------------------------------------------------------------------
    async loadStats(): Promise<any> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/dashboard/stats`)
            );
            if (response?.success) {
                this.stats.set(response.stats);
                return response.stats;
            }
            this.stats.set(this._emptyStats());
        } catch (error: any) {
            console.error('[AdminService] loadStats error:', error?.error?.message || error?.message);
            this.stats.set(this._emptyStats());
        }
    }

    private _emptyStats() {
        return {
            totalUsers: 0, totalStorageUsed: 0, documentCount: 0,
            publicLinksCount: 0, activeRequests: 0, storagePercent: 0,
            growth: [0, 0, 0, 0, 0, 0, 0],
            storageBreakdown: {
                documents: { size: 0, count: 0 }, images: { size: 0, count: 0 },
                videos: { size: 0, count: 0 }, audio: { size: 0, count: 0 },
                other: { size: 0, count: 0 }
            },
            recentActivity: [], recentFiles: [],
            systemCapacity: 10 * 1024 * 1024 * 1024, userTrend: '+0'
        };
    }

    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------
    async loadUsers(options: any = {}): Promise<any[]> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/users`, { params: options })
            );
            if (response?.success) {
                this.users.set(response.users ?? []);
                return response.users ?? [];
            }
            return [];
        } catch (error: any) {
            console.error('[AdminService] loadUsers error:', error?.error?.message || error?.message);
            return [];
        }
    }

    async updateUser(userId: string, data: any): Promise<boolean> {
        try {
            const response: any = await firstValueFrom(
                this.http.put(`${this.apiUrl}/users/${userId}`, data)
            );
            return !!response?.success;
        } catch (error: any) {
            console.error('[AdminService] updateUser error:', error?.error?.message || error?.message);
            return false;
        }
    }

    async deleteUser(userId: string): Promise<boolean> {
        try {
            const response: any = await firstValueFrom(
                this.http.delete(`${this.apiUrl}/users/${userId}`)
            );
            return !!response?.success;
        } catch (error: any) {
            console.error('[AdminService] deleteUser error:', error?.error?.message || error?.message);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Audit Logs
    // -------------------------------------------------------------------------
    async loadLogs(): Promise<any[]> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/audit-logs`)
            );
            if (response?.success) {
                this.logs.set(response.logs ?? []);
                return response.logs ?? [];
            }
            return [];
        } catch (error: any) {
            console.error('[AdminService] loadLogs error:', error?.error?.message || error?.message);
            return [];
        }
    }

    // -------------------------------------------------------------------------
    // System Settings
    // -------------------------------------------------------------------------
    async loadSettings(): Promise<any> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/settings`)
            );
            if (response?.success) {
                this.settings.set(response.settings);
                return response.settings;
            }
        } catch (error: any) {
            console.error('[AdminService] loadSettings error:', error?.error?.message || error?.message);
        }
    }

    async updateSettings(data: any): Promise<boolean> {
        try {
            const response: any = await firstValueFrom(
                this.http.put(`${this.apiUrl}/settings`, data)
            );
            if (response?.success) {
                this.settings.set(response.settings);
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('[AdminService] updateSettings error:', error?.error?.message || error?.message);
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Subscription Plans
    // -------------------------------------------------------------------------
    async loadPlans(): Promise<any[]> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/subscriptions`)
            );
            if (response?.success) {
                this.plans.set(response.plans ?? []);
                return response.plans ?? [];
            }
            return [];
        } catch (error: any) {
            console.error('[AdminService] loadPlans error:', error?.error?.message || error?.message);
            const fallback = this._defaultPlans();
            this.plans.set(fallback);
            return fallback;
        }
    }

    async updatePlan(planId: string, data: any): Promise<boolean> {
        try {
            const response: any = await firstValueFrom(
                this.http.put(`${this.apiUrl}/subscriptions/${planId}`, data)
            );
            if (response?.success) {
                // Refresh plans list after update
                await this.loadPlans();
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('[AdminService] updatePlan error:', error?.error?.message || error?.message);
            return false;
        }
    }

    private _defaultPlans() {
        return [
            {
                id: 'starter', name: 'Starter', description: 'For individual users',
                price: 0, isPopular: false,
                features: ['5 GB Storage', 'Basic AI Assistant', 'Email Support'],
                limits: { storage: 5 * 1024 * 1024 * 1024 }
            },
            {
                id: 'professional', name: 'Professional', description: 'For power users',
                price: 19, isPopular: true,
                features: ['100 GB Storage', 'Advanced AI Assistant', 'Unlimited Sharing', 'Priority Support'],
                limits: { storage: 100 * 1024 * 1024 * 1024 }
            },
            {
                id: 'enterprise', name: 'Enterprise', description: 'For organizations',
                price: 99, isPopular: false,
                features: ['Unlimited Storage', 'Team Collaboration', 'Dedicated Support', 'Custom SLA'],
                limits: { storage: -1 }
            }
        ];
    }

    // -------------------------------------------------------------------------
    // AI Usage Metrics
    // -------------------------------------------------------------------------
    async loadAIMetrics(): Promise<any> {
        try {
            const response: any = await firstValueFrom(
                this.http.get(`${this.apiUrl}/ai-usage/metrics`)
            );
            if (response?.success) {
                this.aiMetrics.set(response.metrics);
                return response.metrics;
            }
        } catch (error: any) {
            console.error('[AdminService] loadAIMetrics error:', error?.error?.message || error?.message);
            // Return empty stats so the UI shows "No activity" instead of fake data
            this.aiMetrics.set(this._emptyAIMetrics());
        }
    }

    private _emptyAIMetrics() {
        return {
            breakdown: [],
            models: [],
            trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            stats: { totalCalls: 0, totalTokens: 0, totalCost: 0 }
        };
    }
}
