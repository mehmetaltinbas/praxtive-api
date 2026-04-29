import * as mongoose from 'mongoose';
import { ExerciseSetModel } from 'src/db/models/exercise-set.model';
import { MAX_SOURCE_TITLE_LENGTH } from 'src/source/constants/max-source-title-length.constant';
import { MIN_SOURCE_LENGTH } from 'src/source/constants/min-source-length.constant';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';
import { SourceDocument } from 'src/source/types/source-document.interface';

const schema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: Object.values(SourceType), required: true },
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: [MIN_SOURCE_LENGTH, `Title is too short (min ${MIN_SOURCE_LENGTH} characters)`],
            maxlength: [MAX_SOURCE_TITLE_LENGTH, `Title is too long (max ${MAX_SOURCE_TITLE_LENGTH} characters)`],
        },
        rawText: String,
        visibility: {
            type: String,
            enum: Object.values(SourceVisibility),
            default: SourceVisibility.PRIVATE,
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
