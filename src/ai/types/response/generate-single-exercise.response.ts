import ResponseBase from 'src/shared/types/response-base.interface';
import { AiGeneratedExercise } from 'src/ai/types/response/generate-exercises.response';

export interface GenerateSingleExerciseResponse extends ResponseBase {
    exercise: Omit<AiGeneratedExercise, 'order'>;
}
