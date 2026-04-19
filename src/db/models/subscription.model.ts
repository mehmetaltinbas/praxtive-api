import * as mongoose from 'mongoose';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
        nextBillingDate: { type: Date, required: true },
        status: {
            type: String,
            enum: Object.values(SubscriptionStatus),
        },
        startedAt: { type: Date },
        canceledAt: { type: Date },
        endedAt: { type: Date },
        paymentRetryCount: { type: Number, default: 0 },
        lastPaymentAttempt: { type: Date },
        gracePeriodEnd: { type: Date },
        lastPaymentProvider: { type: String, enum: ['stripe', 'iyzico'] },
        lastPaymentMethodToken: { type: String },
    },
    { timestamps: true }
);

schema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
schema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: 'canceled' } });
schema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: 'pendingActivate' } });

export const SubscriptionModel = mongoose.model('Subscription', schema);
