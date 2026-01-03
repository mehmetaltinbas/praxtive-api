import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/schemas/exercise-set.model';
import { ProcessedSourceDocument } from 'src/processed-source/types/processed-source-interfaces';

const schema = new mongoose.Schema(
    {
        sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Source', required: true },
        title: String,
        processedText: String,
    },
    { timestamps: true }
);

schema.post('findOneAndDelete', async function (document: ProcessedSourceDocument) {
    if (document) {
        const associatedExerciseSetDocuments = await ExerciseSetModel.find({
            sourceId: document._id,
        });

        await Promise.all(
            associatedExerciseSetDocuments.map((exerciseSetDocument) =>
                ExerciseSetModel.findByIdAndDelete(exerciseSetDocument._id)
            )
        );
    }
});

export const ProcessedSourceModel = mongoose.model('ProcessedSource', schema);
