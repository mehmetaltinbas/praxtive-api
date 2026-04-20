import { Module } from '@nestjs/common';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';

@Module({
    providers: [CreditTransactionService],
    exports: [CreditTransactionService],
})
export class CreditTransactionModule {}
