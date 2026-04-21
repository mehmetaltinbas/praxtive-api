import { Document as MongooseDocument } from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface PaymentMethodDocument extends MongooseDocument {
    _id: string;
    user: UserDocument | string;
    provider: PaymentProviderName;
    providerRef: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    holderName: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
