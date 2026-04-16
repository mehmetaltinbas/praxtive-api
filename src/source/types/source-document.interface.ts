import { Document as MongooseDocument } from 'mongoose';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';

export interface SourceDocument extends MongooseDocument {
    _id: string;
    userId: string;
    type: string;
    title: string;
    rawText: string;
    visibility: SourceVisibility;
}
