import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface SubscriptionPlan {
    id: string;
    name?: string;
    description?: string;
    buttonText?: string;
    features?: string[];
    price?: string;
    order?: number;
}

@Component({
    selector: 'app-plans',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './plans.component.html'
})
export class PlansComponent implements OnInit {
    plans: SubscriptionPlan[] = [];
    loading = true;
    error = '';

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.fetchPlans();
    }

    fetchPlans() {
        this.loading = true;
        this.error = '';

        this.http.get<{ success: boolean, plans: SubscriptionPlan[] }>(`${environment.apiUrl}/plans`)
            .subscribe({
                next: (res) => {
                    this.plans = res.plans || [];

                    // Sort plans if they have an order field, else sort by features length as a proxy for tier
                    this.plans.sort((a, b) => {
                        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
                        return (a.features?.length || 0) - (b.features?.length || 0);
                    });

                    // Ensure they have a name if the DB is missing it
                    this.plans.forEach((plan, i) => {
                        if (!plan.name) {
                            plan.name = i === 0 ? 'Basic' : i === 1 ? 'Pro' : 'Enterprise';
                        }
                        if (!plan.price && plan.name === 'Enterprise') {
                            plan.price = 'Custom';
                        }
                    });

                    this.loading = false;
                },
                error: (err) => {
                    console.error('Error fetching plans', err);
                    this.error = 'Failed to load subscription plans';
                    this.loading = false;
                }
            });
    }
}
