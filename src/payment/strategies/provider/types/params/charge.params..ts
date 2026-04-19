export interface ChargeParams {
    amount: number;
    currency: string;
    paymentMethodToken: string;
    description?: string;
    metadata?: Record<string, string>;
}
