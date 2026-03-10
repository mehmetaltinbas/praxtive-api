import ResponseBase from 'src/shared/types/response-base.interface';

export interface EvaluateExerciseAnswerResponse extends ResponseBase {
    score?: number;
    feedback: string;
}
