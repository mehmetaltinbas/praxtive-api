import * as mongoose from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        provider: {
            type: String,
            enum: Object.values(PaymentProviderName),
            required: true,
        },
        providerRef: { type: String, required: true },
        brand: { type: String, required: true },
        last4: { type: String, required: true },
        expMonth: { type: Number, required: true },
        expYear: { type: Number, required: true },
        holderName: { type: String, default: null },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

schema.index({ user: 1, createdAt: 1 });
schema.index({ user: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
schema.index({ provider: 1, providerRef: 1 }, { unique: true });

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

export const PaymentMethodModel = mongoose.model('PaymentMethod', schema);
