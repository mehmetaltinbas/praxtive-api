import { Module } from '@nestjs/common';
import { BillingModule } from 'src/billing/billing.module';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';
import { PaymentModule } from 'src/payment/payment.module';
import { PlanModule } from 'src/plan/plan.module';
import { SubscriptionController } from 'src/subscription/subscription.controller';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [UserModule, PlanModule, CreditTransactionModule, BillingModule, PaymentModule],
    providers: [SubscriptionService],
    exports: [SubscriptionService],
    controllers: [SubscriptionController],
})
export class SubscriptionModule {}
