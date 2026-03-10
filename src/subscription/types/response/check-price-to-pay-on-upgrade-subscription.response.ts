import ResponseBase from 'src/shared/types/response-base.interface';

export interface CheckPriceToPayOnUpgradeSubscriptionResponse extends ResponseBase {
    priceToPay?: number;
}
