export interface RefundResult {
    success: boolean;
    providerRefundId?: string;
    failureReason?: string;
}
