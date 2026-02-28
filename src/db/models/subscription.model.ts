import * as mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
        nextBillingDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ['active', 'canceled', 'expired', 'pendingActivate', 'upgradedFrom'],
        },
        startedAt: { type: Date },
        canceledAt: { type: Date },
        endedAt: { type: Date },
    },
    { timestamps: true }
);

export const SubscriptionModel = mongoose.model('Subscription', schema);
