import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export type AiGeneratedExercise = Omit<ExerciseDocument, '_id' | 'exerciseSet'>;

export interface AiGeneratedExercisesResponse extends ResponseBase {
    exercises: AiGeneratedExercise[];
}
