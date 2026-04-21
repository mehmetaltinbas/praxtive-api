import { forwardRef, Module } from '@nestjs/common';
import { PaymentMethodController } from 'src/payment-method/payment-method.controller';
import { PaymentMethodService } from 'src/payment-method/payment-method.service';
import { PaymentModule } from 'src/payment/payment.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [PaymentModule, UserModule, forwardRef(() => SubscriptionModule)],
    controllers: [PaymentMethodController],
    providers: [PaymentMethodService],
    exports: [PaymentMethodService],
})
export class PaymentMethodModule {}
