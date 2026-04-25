import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';
import ResponseBase from 'src/shared/types/response-base.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class CreditGuardService {
    constructor(
        private userService: UserService,
        private creditTransactionService: CreditTransactionService
    ) {}

    async assertAndDeduct(
        userId: string,
        amount: number,
        type: CreditTransactionType,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        await this.userService.deductCreditBalance(userId, amount, session);

        await this.creditTransactionService.create(userId, { type, amount }, session);

        return { isSuccess: true, message: 'Credits asserted and deducted.' };
    }
}
