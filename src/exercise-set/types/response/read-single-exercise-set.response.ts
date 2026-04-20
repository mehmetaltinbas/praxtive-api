import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ReadSingleExerciseSetResponse extends ResponseBase {
    exerciseSet: ExerciseSetDocument;
}
