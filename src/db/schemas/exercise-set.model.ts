import * as mongoose from 'mongoose';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import { ExerciseModel } from 'src/db/schemas/exercise.model';

const schema = new mongoose.Schema(
    {
        sourceType: { type: String, enum: ['Source', 'ProcessedSource'], required: true },
        sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
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
        const promises = associatedExerciseDocuments.map((exerciseDocument) => {
            return ExerciseModel.findByIdAndDelete(exerciseDocument._id);
        });
        await Promise.all(promises);
    }
});

export const ExerciseSetModel = mongoose.model('ExerciseSet', schema);
