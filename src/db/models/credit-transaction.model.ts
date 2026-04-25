import * as mongoose from 'mongoose';
import { CreditTransactionType } from 'src/credit-transaction/enums/credit-transaction-type.enum';

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

schema.set('toJSON', {
    transform: (_doc, ret: Record<string, unknown>) => {
        const v = ret.user;
        if (v !== undefined) {
            ret.userId = v && typeof v === 'object' && '_id' in v ? String((v as { _id: unknown })._id) : v;
            delete ret.user;
        }
        return ret;
    },
});

export const CreditTransactionModel = mongoose.model('CreditTransaction', schema);
