import { PaymentMethodDocument } from 'src/payment-method/types/payment-method-document.interface';

export type PaymentMethodDetailsResponse = Pick<
    PaymentMethodDocument,
    'brand' | 'last4' | 'expMonth' | 'expYear' | 'holderName'
>;
