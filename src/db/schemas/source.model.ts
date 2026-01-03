import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/schemas/exercise-set.model';
import { ProcessedSourceModel } from 'src/db/schemas/processed-source.model';
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
        const associatedProcessedSourceDocuments = await ProcessedSourceModel.find({
            sourceId: document._id,
        });

        const associatedExerciseSetDocuments = await ExerciseSetModel.find({
            sourceId: document._id,
        });

        await Promise.all([
            ...associatedProcessedSourceDocuments.map((processedSourceDocument) =>
                ProcessedSourceModel.findByIdAndDelete(processedSourceDocument._id)
            ),
            ...associatedExerciseSetDocuments.map((exerciseSetDocument) =>
                ExerciseSetModel.findByIdAndDelete(exerciseSetDocument._id)
            ),
        ]);
    }
});

export const SourceModel = mongoose.model('Source', schema);
