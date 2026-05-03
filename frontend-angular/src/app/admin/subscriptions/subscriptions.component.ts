import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Subscription {
    id: string;
    userId: string;
    userEmail: string;
    planId: string;
    planName: string;
    amount: number;
    startDate: string;
    expiryDate: string;
    status: string;
    paymentId?: string;
    createdAt: string;
}

@Component({
    selector: 'app-subscriptions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './subscriptions.component.html'
})
export class SubscriptionsComponent implements OnInit {
    subscriptions: Subscription[] = [];
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.fetchSubscriptions();
    }

    fetchSubscriptions() {
        this.loading = true;
        this.error = '';

        this.http.get<{ success: boolean, subscriptions: Subscription[] }>(`${environment.apiUrl}/payment/all-subscriptions`)
            .subscribe({
                next: (res) => {
                    this.subscriptions = res.subscriptions || [];
                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching subscriptions:', err);
                    this.error = 'Failed to load subscriber data.';
                    this.loading = false;
                }
            });
    }

    isExpired(expiryDate: string): boolean {
        return new Date(expiryDate) < new Date();
    }
}
