import { Document as MongooseDocument } from 'mongoose';

export interface ExerciseSetGroupDocument extends MongooseDocument {
    _id: string;
    userId: string;
    title: string;
}
