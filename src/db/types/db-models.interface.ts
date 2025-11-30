import { Model } from 'mongoose';
import { CreditTransactionDocument } from 'src/billing/types/credit-transaction-document.interface';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { ProcessedSourceDocument } from 'src/processed-source/types/processed-source-interfaces';
import { SourceDocument } from 'src/source/types/source-document.interface';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface DbModels {
    User: Model<UserDocument>;
    Plan: Model<PlanDocument>;
    Subscription: Model<SubscriptionDocument>;
    CreditTransaction: Model<CreditTransactionDocument>;
    Source: Model<SourceDocument>;
    ProcessedSource: Model<ProcessedSourceDocument>;
    ExerciseSet: Model<ExerciseSetDocument>;
    Exercise: Model<ExerciseDocument>;
}
