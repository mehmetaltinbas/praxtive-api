import ResponseBase from 'src/shared/types/response-base.interface';

export interface CostEstimateResponse extends ResponseBase {
    credits: number;
    breakdown: Record<string, number>;
}
