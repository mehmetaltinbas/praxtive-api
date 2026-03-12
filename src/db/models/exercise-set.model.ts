import * as mongoose from 'mongoose';
import { ExerciseModel } from 'src/db/models/exercise.model';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId },
        sourceType: { type: String, enum: Object.values(ExerciseSetSourceType), required: true },
        sourceId: { type: mongoose.Schema.Types.ObjectId },
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
    },
    { timestamps: true }
);

schema.index({ userId: 1, title: 1 }, { unique: true });

schema.post('findOneAndDelete', async function (document: ExerciseSetDocument) {
    if (document) {
        const associatedExerciseDocuments = await ExerciseModel.find({
            exerciseSetId: document._id,
        });

        await Promise.all(
            associatedExerciseDocuments.map((exerciseDocument) => ExerciseModel.findByIdAndDelete(exerciseDocument._id))
        );
    }
});

export const ExerciseSetModel = mongoose.model('ExerciseSet', schema);
