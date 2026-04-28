import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import mongoose from 'mongoose';
import { CREDIT_TRANSACTION_DIRECTIONS } from 'src/credit-transaction/constants/credit-transaction-directions.constant';
import { CreditTransactionDirection } from 'src/credit-transaction/enums/credit-transaction-direction.enum';
import { CreditTransactionDocument } from 'src/credit-transaction/types/credit-transaction-document.interface';
import { CreateCreditTransactionDto } from 'src/credit-transaction/types/dto/create-credit-transaction.dto';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class CreditTransactionService {
    constructor(
        @Inject('DB_MODELS')
        private db: Record<'CreditTransaction', mongoose.Model<CreditTransactionDocument>>
    ) {}

    async create(
        userId: string,
        createCreditTransactionDto: CreateCreditTransactionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const { type, amount } = createCreditTransactionDto;
        const direction = CREDIT_TRANSACTION_DIRECTIONS[type];
        const signedAmount = direction === CreditTransactionDirection.DEDUCTION ? -Math.abs(amount) : Math.abs(amount);

        const [creditTransaction] = await this.db.CreditTransaction.create(
            [{ user: userId, type, amount: signedAmount }],
            { session }
        );

        if (!creditTransaction) {
            throw new InternalServerErrorException("credit transaction couldn't be created");
        }

        return { isSuccess: true, message: 'credit transaction created' };
    }
}
