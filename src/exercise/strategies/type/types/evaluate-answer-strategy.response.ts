import ResponseBase from 'src/shared/types/response-base.interface';

export interface EvaluateAnswerStrategyResponse extends ResponseBase {
    score?: number;
    feedback?: string;
}
