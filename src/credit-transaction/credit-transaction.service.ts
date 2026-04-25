import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import mongoose from 'mongoose';
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
            throw new InternalServerErrorException("credit transaction couldn't be created");
        }

        return { isSuccess: true, message: 'credit transcation created' };
    }
}
