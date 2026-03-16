import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ReadMultipleExercisesResponse extends ResponseBase {
    exercises: ExerciseDocument[];
}
