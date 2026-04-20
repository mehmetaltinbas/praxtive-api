import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { ChargeParams } from 'src/payment/strategies/provider/types/params/charge.params.';
import { ChargeResult } from 'src/payment/strategies/provider/types/response/charge-result.response';
import { RefundResult } from 'src/payment/strategies/provider/types/response/refund-result.response';

export interface PaymentProviderStrategy {
    readonly type: PaymentProviderName;

    charge(params: ChargeParams): Promise<ChargeResult>;
    refund(providerTransactionId: string, amount: number, currency: string): Promise<RefundResult>;
}
