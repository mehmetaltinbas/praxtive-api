import * as mongoose from 'mongoose';
import { SourceModel } from 'src/db/models/source.model';
import { UserDocument } from 'src/user/types/user-document.interface';

const schema = new mongoose.Schema(
    {
        userName: { type: String, unique: true, required: true },
        email: { type: String, unique: true, required: true },
        passwordHash: { type: String, default: null },
        googleId: { type: String, unique: true, sparse: true, default: null },
        creditBalance: { type: Number, required: true, default: 50 },
        isEmailVerified: { type: Boolean, required: true, default: false },
        pendingEmail: { type: String, default: null },
        verificationCode: { type: Number, default: null },
        verificationCodeExpiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

schema.post('findOneAndDelete', async function (document: UserDocument) {
    if (document) {
        const associatedSourceDocuments = await SourceModel.find({ userId: document._id });

        await Promise.all(
            associatedSourceDocuments.map((sourceDocument) => SourceModel.findByIdAndDelete(sourceDocument._id))
        );
    }
});

export const UserModel = mongoose.model('User', schema);
