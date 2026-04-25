import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { CreditEstimationService } from 'src/credit-transaction/services/credit-estimation.service';
import { CreditGuardService } from 'src/credit-transaction/services/credit-guard.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [forwardRef(() => AiModule), UserModule],
    providers: [CreditTransactionService, CreditEstimationService, CreditGuardService],
    exports: [CreditTransactionService, CreditEstimationService, CreditGuardService],
})
export class CreditTransactionModule {}
