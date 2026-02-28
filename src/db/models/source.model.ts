import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { SourceDocument } from 'src/source/types/source-document.interface';

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['text', 'document', 'youtubeUrl'], required: true },
        title: String,
        rawText: String,
    },
    { timestamps: true }
);

schema.post('findOneAndDelete', async function (document: SourceDocument) {
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

export const SourceModel = mongoose.model('Source', schema);
