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
    price?: number | string;
    order?: number;
}

declare var Razorpay: any;

@Component({
    standalone: true,
    selector: 'app-plans',
    imports: [CommonModule],
    templateUrl: './plans.component.html'
})
export class PlansComponent implements OnInit {
    plans: SubscriptionPlan[] = [];
    loading = true;
    error = '';
    processingPayment = false;

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

    buyPlan(plan: SubscriptionPlan) {
        if (plan.price === 'Custom' || plan.price === 0 || plan.price === 'Free') {
            alert('This plan is either free or requires custom billing. Please contact support.');
            return;
        }

        if (this.processingPayment) return;
        this.processingPayment = true;

        // 1. Create order on the backend
        this.http.post<any>(`${environment.apiUrl}/payment/create-order`, { planId: plan.id })
            .subscribe({
                next: (orderRes) => {
                    if (!orderRes.success) {
                        alert('Could not initiate payment: ' + (orderRes.message || 'Unknown error'));
                        this.processingPayment = false;
                        return;
                    }

                    // 2. Open Razorpay Checkout
                    const options = {
                        key: orderRes.key,
                        amount: orderRes.amount,
                        currency: orderRes.currency,
                        name: 'Cloud Space',
                        description: `Subscription to ${plan.name} Plan`,
                        image: '/assets/logo.png',
                        order_id: orderRes.orderId,
                        handler: (response: any) => {
                            // 3. Verify payment on backend
                            this.verifyPayment(response, plan.id);
                        },
                        prefill: {
                            name: 'Cloud Space User',
                            method: 'upi' // Suggest UPI as preferred method
                        },
                        notes: {
                            plan_id: plan.id,
                            plan_name: plan.name,
                            category: 'Subscription'
                        },
                        theme: {
                            color: '#4f46e5'
                        },
                        config: {
                            display: {
                                blocks: {
                                    upi: {
                                        name: 'UPI / QR Code',
                                        instruments: [{ method: 'upi' }]
                                    }
                                },
                                sequence: ['block.upi', 'block.other'],
                                preferences: {
                                    show_default_blocks: true
                                }
                            }
                        },
                        modal: {
                            ondismiss: () => {
                                this.processingPayment = false;
                            }
                        }
                    };

                    const rzp = new Razorpay(options);

                    rzp.on('payment.failed', (response: any) => {
                        console.error('Payment Failed:', response.error);
                        alert('Payment failed. Please try again.');
                        this.processingPayment = false;
                    });

                    rzp.open();
                },
                error: (err) => {
                    console.error('Error creating order', err);
                    const msg = err.error?.error || err.error?.message || 'Error preparing payment gateway.';
                    alert(msg);
                    this.processingPayment = false;
                }
            });
    }

    verifyPayment(response: any, planId: string) {
        const verifyData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId: planId
        };

        this.http.post<any>(`${environment.apiUrl}/payment/verify`, verifyData)
            .subscribe({
                next: (res) => {
                    this.processingPayment = false;
                    if (res.success) {
                        alert('Payment Successful! Your plan has been upgraded.');
                        // Could navigate to dashboard here or refresh user status
                        window.location.reload();
                    } else {
                        alert('Payment verification failed.');
                    }
                },
                error: (err) => {
                    this.processingPayment = false;
                    console.error('Verification error:', err);
                    alert('Error verifying payment. If amount deducted, it will be refunded or manually credited.');
                }
            });
    }
}
