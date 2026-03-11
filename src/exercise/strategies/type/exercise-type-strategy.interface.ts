import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

export interface ExerciseTypeStrategy {
    readonly type: ExerciseType;

    getCreateExerciseData(dto: CreateExerciseDto): Record<string, unknown>;
    evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse>;
}
