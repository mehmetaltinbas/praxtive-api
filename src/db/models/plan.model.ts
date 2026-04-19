import * as mongoose from 'mongoose';
import { SubscriptionModel } from 'src/db/models/subscription.model';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { PlanDocument } from 'src/plan/types/plan-document.interface';

const schema = new mongoose.Schema(
    {
        name: { type: String, enum: Object.values(PlanName), unique: true, required: true },
        monthlyPrice: { type: Number, required: true },
        currency: { type: String, required: true },
        monthlyCredits: { type: Number, required: true },
        maximumCredits: { type: Number, required: true },
        maxSources: { type: Number, required: true },
        maxExerciseSets: { type: Number, required: true },
    },
    { timestamps: false }
);

schema.post('findOneAndDelete', async function (document: PlanDocument) {
    if (!document) return;
    await SubscriptionModel.deleteMany({ plan: document._id });
});

export const PlanModel = mongoose.model('Plan', schema);
