import { Document as MongooseDocument } from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentStatus } from 'src/payment/enums/payment-status.enum';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface PaymentDocument extends MongooseDocument {
    _id: string;
    user: UserDocument;
    subscription: SubscriptionDocument;
    amount: number;
    currency: string;
    provider: PaymentProviderName;
    status: PaymentStatus;
    providerTransactionId?: string;
    failureReason?: string;
}
