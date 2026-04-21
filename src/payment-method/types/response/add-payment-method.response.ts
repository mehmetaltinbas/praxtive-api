import { PaymentMethodDocument } from 'src/payment-method/types/payment-method-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface AddPaymentMethodResponse extends ResponseBase {
    paymentMethod: PaymentMethodDocument;
}
