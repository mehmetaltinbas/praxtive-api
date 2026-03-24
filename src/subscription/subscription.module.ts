import { Module } from '@nestjs/common';
import { BillingModule } from 'src/billing/billing.module';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';
import { PaymentModule } from 'src/payment/payment.module';
import { PlanModule } from 'src/plan/plan.module';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserModule } from 'src/user/user.module';
import { SubscriptionController } from './subscription.controller';

@Module({
    imports: [UserModule, PlanModule, CreditTransactionModule, BillingModule, PaymentModule],
    providers: [SubscriptionService],
    exports: [SubscriptionService],
    controllers: [SubscriptionController],
})
export class SubscriptionModule {}
