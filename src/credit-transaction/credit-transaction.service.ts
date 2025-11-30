import { Inject, Injectable } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { CreditTransactionDocument } from 'src/billing/types/credit-transaction-document.interface';
import { CreateCreditTransactionDto } from 'src/credit-transaction/types/dto/create-credit-transaction.dto';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

@Injectable()
export class CreditTransactionService {
    constructor(
        @Inject('DB_MODELS')
        private db: Record<'CreditTransaction', Model<CreditTransactionDocument>>
    ) {}

    async create(
        userId: string,
        createCreditTransactionDto: CreateCreditTransactionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const [creditTransaction] = await this.db.CreditTransaction.create(
            [
                {
                    user: userId,
                    ...createCreditTransactionDto,
                },
            ],
            { session }
        );
        if (!creditTransaction) {
            return { isSuccess: false, message: "credit transaction couldn't created" };
        }
        return { isSuccess: true, message: 'credit transcation created' };
    }
}
