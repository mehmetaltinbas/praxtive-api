import { Document as MongooseDocument } from 'mongoose';

export interface SourceDocument extends MongooseDocument {
    _id: string;
    userId: string;
    type: string;
    title: string;
    rawText: string;
}
