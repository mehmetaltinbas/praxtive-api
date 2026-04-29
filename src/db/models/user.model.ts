import * as mongoose from 'mongoose';
import { CreditTransactionModel } from 'src/db/models/credit-transaction.model';
import { ExerciseSetGroupModel } from 'src/db/models/exercise-set-group.model';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { FeedbackModel } from 'src/db/models/feedback.model';
import { PaymentMethodModel } from 'src/db/models/payment-method.model';
import { SourceModel } from 'src/db/models/source.model';
import { SubscriptionModel } from 'src/db/models/subscription.model';
import { UserDocument } from 'src/user/types/user-document.interface';

const schema = new mongoose.Schema(
    {
        userName: { type: String, unique: true, required: true },
        email: { type: String, unique: true, required: true },
        passwordHash: { type: String, default: null },
        googleId: { type: String, unique: true, sparse: true, default: null },
        creditBalance: { type: Number, required: true, default: 0 },
        isEmailVerified: { type: Boolean, required: true, default: false },
        pendingEmail: { type: String, default: null },
        verificationCode: { type: Number, default: null },
        verificationCodeExpiresAt: { type: Date, default: null },
        paymentProviderCustomerId: { type: String, sparse: true, default: null },
        allowsMarketing: { type: Boolean, required: true },
        occupation: { type: String, required: true },
    },
    { timestamps: true }
);

schema.post('findOneAndDelete', async function (document: UserDocument) {
    if (!document) return;

    await Promise.all([
        SubscriptionModel.deleteMany({ user: document._id }),
        CreditTransactionModel.deleteMany({ user: document._id }),
        FeedbackModel.deleteMany({ user: document._id }),
        PaymentMethodModel.deleteMany({ user: document._id }),
    ]);

    const [groups, sources] = await Promise.all([
        ExerciseSetGroupModel.find({ user: document._id }),
        SourceModel.find({ user: document._id }),
    ]);

    await Promise.all([
        ...groups.map((group) => ExerciseSetGroupModel.findByIdAndDelete(group._id)),
        ...sources.map((source) => SourceModel.findByIdAndDelete(source._id)),
    ]);

    const orphanExerciseSets = await ExerciseSetModel.find({ user: document._id });

    await Promise.all(orphanExerciseSets.map((exerciseSet) => ExerciseSetModel.findByIdAndDelete(exerciseSet._id)));
});

export const UserModel = mongoose.model('User', schema);
