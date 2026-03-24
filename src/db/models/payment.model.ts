import * as mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true, default: 'TRY' },
        provider: {
            type: String,
            enum: ['stripe', 'iyzico'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', 'refunded'],
            required: true,
        },
        providerTransactionId: { type: String, sparse: true },
        failureReason: { type: String },
    },
    { timestamps: true }
);

schema.index({ user: 1, createdAt: -1 });
schema.index({ subscription: 1 });

export const PaymentModel = mongoose.model('Payment', schema);
