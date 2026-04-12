import * as mongoose from 'mongoose';
import { FeedbackStatus } from 'src/feedback/enums/feedback-status.enum';

const schema = new mongoose.Schema(
    {
        userId: {
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

export const FeedbackModel = mongoose.model('Feedback', schema);
