import { IsNotEmpty } from 'class-validator';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';

export class CreateCreditTransactionDto {
    @IsNotEmpty()
    readonly type!: CreditTransactionType;

    @IsNotEmpty()
    readonly amount!: number;
}
