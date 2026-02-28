import { EvaluateAnswerStrategyResponse } from 'src/exercise-set/types/response/evaluate-answer-strategy-response';
import type { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

export interface ExerciseSetTypeStrategy {
    evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse>;
}
