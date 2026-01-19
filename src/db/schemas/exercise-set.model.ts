import * as mongoose from 'mongoose';
import { ExerciseModel } from 'src/db/schemas/exercise.model';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId },
        sourceType: { type: String, enum: ['source', 'processedSource', 'independent'], required: true },
        sourceId: { type: mongoose.Schema.Types.ObjectId },
        title: { type: String },
        type: {
            type: String,
            enum: ['mix', 'mcq', 'trueFalse', 'short', 'openEnded'],
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['mix', 'easy', 'medium', 'hard'],
            default: 'medium',
        },
        count: { type: Number, required: true },
    },
    { timestamps: true }
);

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
