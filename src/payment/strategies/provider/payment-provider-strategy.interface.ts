import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { ChargeParams } from 'src/payment/strategies/provider/types/params/charge.params.';
import { ChargeResult } from 'src/payment/strategies/provider/types/response/charge-result.response';
import { EnsureCustomerResponse } from 'src/payment/strategies/provider/types/response/ensure-customer.response';
import { PaymentMethodDetailsResponse } from 'src/payment/strategies/provider/types/response/payment-method-details.response';
import { RefundResult } from 'src/payment/strategies/provider/types/response/refund-result.response';
import { SetupIntentResultResponse } from 'src/payment/strategies/provider/types/response/setup-intent.response';

export interface PaymentProviderStrategy {
    readonly type: PaymentProviderName;

    charge(params: ChargeParams): Promise<ChargeResult>;
    refund(providerTransactionId: string, amount: number, currency: string): Promise<RefundResult>;
    ensureCustomer(userId: string, email: string): Promise<EnsureCustomerResponse>;
    createSetupIntent(customerId: string): Promise<SetupIntentResultResponse>;
    retrieveMethodDetails(providerRef: string): Promise<PaymentMethodDetailsResponse>;
    attachToCustomer(providerRef: string, customerId: string): Promise<void>;
    detach(providerRef: string): Promise<void>;
}
