import { forwardRef, Module } from '@nestjs/common';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';
import { PaymentMethodModule } from 'src/payment-method/payment-method.module';
import { PaymentModule } from 'src/payment/payment.module';
import { PlanModule } from 'src/plan/plan.module';
import { SubscriptionController } from 'src/subscription/subscription.controller';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [UserModule, PlanModule, CreditTransactionModule, PaymentModule, forwardRef(() => PaymentMethodModule)],
    providers: [SubscriptionService],
    exports: [SubscriptionService],
    controllers: [SubscriptionController],
})
export class SubscriptionModule {}
