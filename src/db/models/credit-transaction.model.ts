import * as mongoose from 'mongoose';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: Object.values(CreditTransactionType),
            required: true,
        },
        amount: { type: Number, required: true },
    },
    { timestamps: true }
);

export const CreditTransactionModel = mongoose.model('CreditTransaction', schema);
