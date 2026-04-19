import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { BillingService } from 'src/billing/billing.service';
import { CostEstimationService } from 'src/billing/services/cost-estimation.service';
import { CreditGuardService } from 'src/billing/services/credit-guard.service';
import { CreditTransactionModule } from 'src/credit-transaction/credit-transaction.module';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [UserModule, CreditTransactionModule, forwardRef(() => AiModule)],
    providers: [BillingService, CostEstimationService, CreditGuardService],
    exports: [BillingService, CostEstimationService, CreditGuardService],
})
export class BillingModule {}
