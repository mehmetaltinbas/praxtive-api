import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { ExerciseSetGroupDocument } from 'src/exercise-set-group/types/exercise-set-group-document.interface';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
    },
    { timestamps: true }
);

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

schema.post('findOneAndDelete', async function (document: ExerciseSetGroupDocument) {
    if (document) {
        const associatedExerciseSetDocuments = await ExerciseSetModel.find({
            contextId: document._id,
        });

        await Promise.all([
            ...associatedExerciseSetDocuments.map((exerciseSetDocument) =>
                ExerciseSetModel.findByIdAndDelete(exerciseSetDocument._id)
            ),
        ]);
    }
});

export const ExerciseSetGroupModel = mongoose.model('ExerciseSetGroup', schema);
