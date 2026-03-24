import { Type } from '@nestjs/common';
import { IyzicoPaymentProviderStrategy } from 'src/payment/strategies/provider/implementations/iyzico-payment-provider.strategy';
import { StripePaymentProviderStrategy } from 'src/payment/strategies/provider/implementations/stripe-payment-provider.strategy';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';

export const PaymentProviderStrategiesBarrel: Type<PaymentProviderStrategy>[] = [
    StripePaymentProviderStrategy,
    IyzicoPaymentProviderStrategy,
];
