import * as mongoose from 'mongoose';
import { FeedbackStatus } from 'src/feedback/enums/feedback-status.enum';

const schema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(FeedbackStatus),
            default: FeedbackStatus.NEW,
        },
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

export const FeedbackModel = mongoose.model('Feedback', schema);
