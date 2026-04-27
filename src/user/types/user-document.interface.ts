import { Document as MongooseDocument } from 'mongoose';

export interface UserDocument extends MongooseDocument {
    _id: string;
    userName: string;
    email: string;
    passwordHash: string | null;
    googleId: string | null;
    creditBalance: number;
    isEmailVerified: boolean;
    pendingEmail: string | null;
    verificationCode: number | null;
    verificationCodeExpiresAt: Date | null;
    paymentProviderCustomerId: string | null;
    allowsMarketing: boolean;
    createdAt: Date;
    updatedAt: Date;
}
