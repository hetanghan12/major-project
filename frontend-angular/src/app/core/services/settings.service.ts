import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserSettings {
    storage: {
        defaultFolder: string;
        autoDeleteTrash: string;
        fileVersioning: boolean;
    };
    ai: {
        accessScope: string;
        autoSummary: boolean;
        smartTagging: boolean;
    };
}

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private apiUrl = `${environment.apiUrl}/settings`;

    private _settings = signal<UserSettings | null>(null);
    private _isLoading = signal<boolean>(false);

    readonly settings = computed(() => this._settings());
    readonly isLoading = computed(() => this._isLoading());

    constructor(private http: HttpClient) { }

    /**
     * Fetch user settings from backend
     */
    loadSettings(): Observable<{ success: boolean, settings: UserSettings }> {
        this._isLoading.set(true);
        return this.http.get<{ success: boolean, settings: UserSettings }>(this.apiUrl).pipe(
            tap({
                next: (res) => {
                    if (res.success) {
                        this._settings.set(res.settings);
                    }
                    this._isLoading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load settings:', err);
                    this._isLoading.set(false);
                }
            })
        );
    }

    /**
     * Update entire settings or partial settings
     */
    updateSettings(newSettings: Partial<UserSettings>): Observable<any> {
        // Optimistic UI update
        const current = this._settings();
        if (current) {
            this._settings.set({
                ...current,
                ...newSettings,
                storage: { ...current.storage, ...(newSettings.storage || {}) },
                ai: { ...current.ai, ...(newSettings.ai || {}) }
            });
        }

        return this.http.put(this.apiUrl, newSettings);
    }

    /**
     * Clear AI History
     */
    clearAIHistory(): Observable<any> {
        return this.http.post(`${this.apiUrl}/ai/clear-history`, {});
    }

    /**
     * Delete Account
     */
    deleteAccount(): Observable<any> {
        return this.http.delete(`${this.apiUrl}/account`);
    }
}
