import * as mongoose from 'mongoose';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
import { SubscriptionModel } from 'src/db/models/subscription.model';

const schema = new mongoose.Schema(
    {
        name: { type: String, enum: ['free', 'pro', 'business'], unique: true, required: true },
        monthlyPrice: { type: Number, required: true },
        monthlyCredits: { type: Number, required: true },
        maximumCredits: { type: Number, required: true },
    },
    { timestamps: false }
);

schema.post('findOneAndDelete', async function (document: PlanDocument) {
    if (!document) return;
    await SubscriptionModel.deleteMany({ plan: document._id });
});

export const PlanModel = mongoose.model('Plan', schema);
