import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface CheckPriceToPayOnUpgradeSubscriptionResponse extends ResponseBase {
    priceToPay?: number;
}
