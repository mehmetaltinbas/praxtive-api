import ResponseBase from '../../../shared/interfaces/response-base.interface';
import { ExerciseDocument } from '../exercise-document.interface';

export interface ReadAllExercisesResponse extends ResponseBase {
    exercises: ExerciseDocument[];
}
