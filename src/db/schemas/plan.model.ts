import * as mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        name: { type: String, enum: ['free', 'pro', 'business'], unique: true, required: true },
        monthlyPrice: { type: Number, required: true },
        monthlyCredits: { type: Number, required: true },
        maximumCredits: { type: Number, required: true }
    },
    { timestamps: false }
);

export const PlanModel = mongoose.model('Plan', schema);
