export interface ChargeParams {
    amount: number;
    currency: string;
    paymentMethodToken: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
}
