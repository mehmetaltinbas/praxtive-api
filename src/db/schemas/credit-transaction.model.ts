import * as mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: {
            type: String,
            enum: ['monthly', 'oneTime', 'sourceProcess', 'exerciseSetGeneration'],
            required: true,
        },
        amount: { type: Number, required: true },
    },
    { timestamps: true }
);

export const CreditTransactionModel = mongoose.model('CreditTransaction', schema);
