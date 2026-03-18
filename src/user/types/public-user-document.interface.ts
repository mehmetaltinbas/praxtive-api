import { Document as MongooseDocument } from 'mongoose';

export interface PublicUserDocument extends MongooseDocument {
    userName: string;
}
