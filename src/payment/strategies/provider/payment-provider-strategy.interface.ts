import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { ChargeParams } from 'src/payment/strategies/provider/types/charge-params.interface';
import { ChargeResult } from 'src/payment/strategies/provider/types/charge-result.interface';
import { RefundResult } from 'src/payment/strategies/provider/types/refund-result.interface';

export interface PaymentProviderStrategy {
    readonly type: PaymentProviderName;

    charge(params: ChargeParams): Promise<ChargeResult>;
    refund(providerTransactionId: string, amount: number): Promise<RefundResult>;
}
