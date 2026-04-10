import { Mongoose } from 'mongoose';
import { CreditTransactionModel } from 'src/db/models/credit-transaction.model';
import { ExerciseSetGroupModel } from 'src/db/models/exercise-set-group.model';
import { PlanModel } from 'src/db/models/plan.model';
import { SubscriptionModel } from 'src/db/models/subscription.model';
import { ExerciseSetModel } from './models/exercise-set.model';
import { ExerciseModel } from './models/exercise.model';
import { SourceModel } from './models/source.model';
import { UserModel } from './models/user.model';

let models: Record<string, Mongoose['Model']>;

export const dbModelsProvider = {
    provide: 'DB_MODELS',
    useFactory: (mongoose: Mongoose): Record<string, Mongoose['Model']> => {
        console.log('creating models...');

        models = {
            User: UserModel,
            Plan: PlanModel,
            Subscription: SubscriptionModel,
            CreditTransaction: CreditTransactionModel,
            Source: SourceModel,
            ExerciseSetGroup: ExerciseSetGroupModel,
            ExerciseSet: ExerciseSetModel,
            Exercise: ExerciseModel,
        };

        return models;
    },
    inject: ['DB_CONNECTION'],
};

export async function cleanDb(mongoose: Mongoose): Promise<void> {
    if (!models || !models.User) {
        throw new Error('Models not initialized');
    }

    await models.User.deleteMany({});

    console.log(`\ndb cleaned\n`);
}
