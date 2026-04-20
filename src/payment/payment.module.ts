import { Module } from '@nestjs/common';
import { PaymentService } from 'src/payment/payment.service';
import { PaymentProviderFactory } from 'src/payment/strategies/provider/payment-provider.factory';
import { PaymentProviderStrategiesBarrel } from 'src/payment/strategies/provider/payment-provider-strategies.barrel';

@Module({
    providers: [PaymentService, PaymentProviderFactory, ...PaymentProviderStrategiesBarrel],
    exports: [PaymentService],
})
export class PaymentModule {}
