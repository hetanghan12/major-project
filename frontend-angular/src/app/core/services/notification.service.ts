import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';

export interface Notification {
    id: string;
    userId: string;
    type: 'upload' | 'ai' | 'share';
    message: string;
    fileId?: string;
    read: boolean;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/notifications`;

    private _notifications = signal<Notification[]>([]);
    private _isLoading = signal<boolean>(false);
    private pollInterval: any;
    private CACHE_KEY = 'cloudai_notifications_cache';

    constructor() {
        this.loadFromCache();
    }

    /**
     * Load notifications from local cache
     */
    private loadFromCache(): void {
        const cached = localStorage.getItem(this.CACHE_KEY);
        if (cached) {
            try {
                const notifications = JSON.parse(cached);
                this._notifications.set(notifications);
            } catch (e) {
                console.warn('[NotifService] Cache parse failed');
            }
        }
    }

    /**
     * Save notifications to local cache
     */
    private saveToCache(notifications: Notification[]): void {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(notifications));
    }

    readonly notifications = computed(() => this._notifications());
    readonly unreadCount = computed(() => 
        this._notifications().filter(n => !n.read).length
    );
    readonly isLoading = computed(() => this._isLoading());

    /**
     * Fetch user notifications
     */
    loadNotifications(): Observable<any> {
        this._isLoading.set(true);
        return this.http.get<{ success: boolean; notifications: Notification[] }>(this.apiUrl).pipe(
            tap(res => {
                if (res.success) {
                    const newNotifs = res.notifications || [];
                    // Only update and cache if data actually changed
                    if (JSON.stringify(this._notifications()) !== JSON.stringify(newNotifs)) {
                        console.log('[NotificationService] Updates found, syncing...');
                        this._notifications.set(newNotifs);
                        this.saveToCache(newNotifs);
                    }
                }
                this._isLoading.set(false);
            }),
            catchError(err => {
                console.error('Failed to load notifications:', err);
                this._isLoading.set(false);
                return of({ success: false, notifications: [] });
            })
        );
    }

    /**
     * Start background polling for new notifications
     */
    startPolling(intervalMs: number = 30000): void {
        this.stopPolling();
        this.pollInterval = setInterval(() => {
            this.loadNotifications().subscribe();
        }, intervalMs);
        console.log(`📡 Notification polling started (${intervalMs}ms)`);
    }

    /**
     * Stop background polling
     */
    stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Mark a notification as read
     */
    markAsRead(notificationId: string): Observable<any> {
        // Optimistic update
        this._notifications.update(list => 
            list.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );

        return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
            catchError(err => {
                console.error('Failed to mark notification as read:', err);
                // Rollback if needed
                return of({ success: false });
            })
        );
    }

    /**
     * Mark all as read (convenience)
     */
    markAllAsRead(): void {
        const unreadIds = this._notifications()
            .filter(n => !n.read)
            .map(n => n.id);
        
        unreadIds.forEach(id => {
            this.markAsRead(id).subscribe();
        });
    }
}
