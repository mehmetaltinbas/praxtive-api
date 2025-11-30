import { Document as MongooseDocument } from 'mongoose';

export interface UserDocument extends MongooseDocument {
    _id: string;
    userName: string;
    email: string;
    passwordHash: string;
    creditBalance: number;
}
