import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface EvaluateExerciseAnswerResponse extends ResponseBase {
    score?: number;
    feedback: string;
}
