import ResponseBase from 'src/shared/types/response-base.interface';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';

export interface ReadCurrentSubscriptionResponse extends ResponseBase {
    currentSubscription?: SubscriptionDocument;
    pendingSubscription?: SubscriptionDocument;
}
