import { Document as MongooseDocument } from 'mongoose';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';

export interface CreditTransactionDocument extends MongooseDocument {
    _id: string;
    user: string;
    type: CreditTransactionType;
    amount: number;
}
