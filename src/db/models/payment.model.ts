import * as mongoose from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentStatus } from 'src/payment/enums/payment-status.enum';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        provider: {
            type: String,
            enum: Object.values(PaymentProviderName),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(PaymentStatus),
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
