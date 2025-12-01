import { Document as MongooseDocument } from 'mongoose';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export interface PlanDocument extends MongooseDocument {
    _id: string;
    name: PlanName;
    monthlyPrice: number;
    monthlyCredits: number;
    maximumCredits: number;
}
