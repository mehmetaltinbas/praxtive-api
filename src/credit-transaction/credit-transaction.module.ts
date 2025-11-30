import { Module } from '@nestjs/common';
import { CreditTransactionService } from './credit-transaction.service';

@Module({
    providers: [CreditTransactionService],
    exports: [CreditTransactionService],
})
export class CreditTransactionModule {}
