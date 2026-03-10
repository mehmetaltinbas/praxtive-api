import ResponseBase from '../../../shared/types/response-base.interface';
import { ExerciseSetDocument } from '../exercise-set-document.interface';

export interface ReadSingleExerciseSetResponse extends ResponseBase {
    exerciseSet: ExerciseSetDocument;
}
