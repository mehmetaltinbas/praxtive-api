import { Module } from '@nestjs/common';
import { PlanModule } from 'src/plan/plan.module';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserModule } from 'src/user/user.module';
import { SubscriptionController } from './subscription.controller';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';

@Module({
    imports: [UserModule, PlanModule, CreditTransactionModule],
    providers: [SubscriptionService],
    exports: [SubscriptionService],
    controllers: [SubscriptionController],
})
export class SubscriptionModule {}
