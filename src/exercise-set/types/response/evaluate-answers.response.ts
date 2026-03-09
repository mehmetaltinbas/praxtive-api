import ResponseBase from 'src/shared/interfaces/response-base.interface';

export interface ExerciseAnswerEvaluationResult {
    exerciseId: string;
    exerciseType: string;
    userAnswer: string;
    score: number;
    feedback: string;
    solution?: string;
    correctChoiceIndex?: number;
}

export interface EvaluateAnswersResponse extends ResponseBase {
    overallScore: number;
    exerciseAnswerEvaluationResults: ExerciseAnswerEvaluationResult[];
}
