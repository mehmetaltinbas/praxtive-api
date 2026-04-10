import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { ExerciseSetGroupDocument } from 'src/exercise-set-group/types/exercise-set-group-document.interface';

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        title: { type: String, required: true },
    },
    { timestamps: true }
);

schema.post('findOneAndDelete', async function (document: ExerciseSetGroupDocument) {
    if (document) {
        const associatedExerciseSetDocuments = await ExerciseSetModel.find({
            sourceId: document._id,
        });

        await Promise.all([
            ...associatedExerciseSetDocuments.map((exerciseSetDocument) =>
                ExerciseSetModel.findByIdAndDelete(exerciseSetDocument._id)
            ),
        ]);
    }
});

export const ExerciseSetGroupModel = mongoose.model('ExerciseSetGroup', schema);
