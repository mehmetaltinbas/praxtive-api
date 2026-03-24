import { Document as MongooseDocument } from 'mongoose';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';
import { UserDocument } from 'src/user/types/user-document.interface';

export interface SubscriptionDocument extends MongooseDocument {
    _id: string;
    user: UserDocument;
    plan: PlanDocument;
    nextBillingDate: Date;
    status: SubscriptionStatus;
    startedAt?: Date;
    canceledAt?: Date;
    endedAt?: Date;
    paymentRetryCount: number;
    lastPaymentAttempt?: Date;
    gracePeriodEnd?: Date;
    lastPaymentProvider?: PaymentProviderName;
    lastPaymentMethodToken?: string;
}
