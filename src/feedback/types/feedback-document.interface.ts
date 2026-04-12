import { Document as MongooseDocument } from 'mongoose';
import { FeedbackStatus } from 'src/feedback/enums/feedback-status.enum';

export interface FeedbackDocument extends MongooseDocument {
    _id: string;
    userId: string;
    content: string;
    status: FeedbackStatus;
}
