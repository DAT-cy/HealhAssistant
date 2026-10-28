import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface BillingPlan { code: string; name: string; priceMinor: number; currency: string; durationDays: number; features: string[] }
export interface PaymentTransaction {
  transactionRef: string; planCode: string; provider: 'STRIPE' | 'PAYPAL'; status: string; providerStatus: string | null;
  amountMinor: number; currency: string; createdAt: string; paidAt: string | null;
}
export interface UserSubscription {
  id: number; planCode: string; provider: 'STRIPE' | 'PAYPAL'; status: string;
  startsAt: string; endsAt: string; cancelledAt: string | null; refundedAt: string | null;
}
export interface BillingStatus {
  tier: 'FREE' | 'PREMIUM'; status: string; planCode: string | null; startsAt: string | null; endsAt: string | null;
  premiumActive: boolean; subscriptions: UserSubscription[]; transactions: PaymentTransaction[];
}
export interface CheckoutResult { transactionRef: string; provider: 'STRIPE' | 'PAYPAL'; status: string; approvalUrl: string; amountMinor: number; currency: string }
const path = `${apiVersion}/billing`;

export const billingService = {
  plans: () => apiClient.request<BillingPlan[]>(`${path}/plans`),
  status: () => apiClient.request<BillingStatus>(`${path}/me`),
  checkout: (planCode: string, provider: 'STRIPE' | 'PAYPAL') => apiClient.request<CheckoutResult>(`${path}/checkout`, {
    method: 'POST', body: JSON.stringify({ planCode, provider }),
  }),
  transaction: (ref: string) => apiClient.request<PaymentTransaction>(`${path}/transactions/${encodeURIComponent(ref)}`),
  capturePaypal: (ref: string) => apiClient.request<PaymentTransaction>(`${path}/transactions/${encodeURIComponent(ref)}/paypal/capture`, { method: 'POST' }),
};
