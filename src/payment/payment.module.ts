import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentProviderFactory } from './strategies/provider/payment-provider.factory';
import { PaymentProviderStrategiesBarrel } from './strategies/provider/payment-provider-strategies.barrel';

@Module({
    providers: [PaymentService, PaymentProviderFactory, ...PaymentProviderStrategiesBarrel],
    exports: [PaymentService, PaymentProviderFactory],
})
export class PaymentModule {}
