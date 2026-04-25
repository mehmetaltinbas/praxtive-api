import ResponseBase from 'src/shared/types/response-base.interface';

export interface CreditEstimateResponse extends ResponseBase {
    credits: number;
    breakdown: Record<string, number>;
}
