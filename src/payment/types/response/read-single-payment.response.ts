import { PaymentDocument } from 'src/payment/types/payment-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ReadSinglePaymentResponse extends ResponseBase {
    payment: PaymentDocument;
}
