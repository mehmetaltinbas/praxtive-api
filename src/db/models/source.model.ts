import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';
import { SourceDocument } from 'src/source/types/source-document.interface';

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: Object.values(SourceType), required: true },
        title: { type: String, required: true },
        rawText: String,
        visibility: {
            type: String,
            enum: Object.values(SourceVisibility),
            default: SourceVisibility.PRIVATE,
        },
    },
    { timestamps: true }
);

schema.index({ userId: 1, title: 1 }, { unique: true });

schema.post('findOneAndDelete', async function (document: SourceDocument) {
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

export const SourceModel = mongoose.model('Source', schema);
