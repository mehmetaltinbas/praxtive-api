import * as mongoose from 'mongoose';
import { ExerciseModel } from 'src/db/models/exercise.model';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        contextType: { type: String, enum: Object.values(ExerciseSetContextType), required: true },
        contextId: { type: mongoose.Schema.Types.ObjectId },
        title: { type: String, required: true },
        type: {
            type: String,
            enum: Object.values(ExerciseSetType),
            required: true,
        },
        difficulty: {
            type: String,
            enum: Object.values(ExerciseSetDifficulty),
            default: 'medium',
        },
        count: { type: Number, required: true },
        visibility: {
            type: String,
            enum: Object.values(ExerciseSetVisibility),
            default: ExerciseSetVisibility.PRIVATE,
        },
    },
    { timestamps: true }
);

schema.index({ user: 1, title: 1 }, { unique: true });

schema.set('toJSON', {
    transform: (_doc, ret: Record<string, unknown>) => {
        const v = ret.user;

        if (v !== undefined) {
            ret.userId = v && typeof v === 'object' && '_id' in v ? String((v as { _id: unknown })._id) : v;
            delete ret.user;
        }

        return ret;
    },
});

schema.post('findOneAndDelete', async function (document: ExerciseSetDocument) {
    if (document) {
        const associatedExerciseDocuments = await ExerciseModel.find({
            exerciseSet: document._id,
        });

        await Promise.all(
            associatedExerciseDocuments.map((exerciseDocument) => ExerciseModel.findByIdAndDelete(exerciseDocument._id))
        );
    }
});

export const ExerciseSetModel = mongoose.model('ExerciseSet', schema);
