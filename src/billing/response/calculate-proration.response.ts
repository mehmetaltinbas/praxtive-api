import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface CalculateProrationResponse extends ResponseBase {
    prorationedPriceToPay: number;
    extractedPrice: number;
    remainingDays: number;
}
