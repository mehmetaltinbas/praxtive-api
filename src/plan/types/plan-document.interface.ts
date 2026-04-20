import { Document as MongooseDocument } from 'mongoose';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export interface PlanDocument extends MongooseDocument {
    _id: string;
    name: PlanName;
    monthlyPrice: number;
    currency: string;
    monthlyCredits: number;
    maximumCredits: number;
    maxSources: number;
    maxExerciseSets: number;
}
