import * as mongoose from 'mongoose';
import { SourceModel } from 'src/db/schemas/source.model';
import { UserDocument } from 'src/user/types/user-document.interface';

const schema = new mongoose.Schema(
    {
        userName: { type: String, unique: true, required: true },
        email: { type: String, unique: true, required: true },
        passwordHash: { type: String, required: true },
        creditBalance: { type: Number, required: true, default: 50 },
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
