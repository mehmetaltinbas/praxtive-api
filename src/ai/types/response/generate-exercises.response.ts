import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

export type AiGeneratedExercise = Omit<ExerciseDocument, '_id' | 'exerciseSetId'>;

export interface AiGeneratedExercisesResponse extends ResponseBase {
    exercises: AiGeneratedExercise[];
}
