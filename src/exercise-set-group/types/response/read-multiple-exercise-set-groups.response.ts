import { ExerciseSetGroupDocument } from 'src/exercise-set-group/types/exercise-set-group-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface ReadMultipleExerciseSetGroupsResponse extends ResponseBase {
    exerciseSetGroups: ExerciseSetGroupDocument[];
}
