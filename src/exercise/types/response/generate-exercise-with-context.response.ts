import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

export interface GenerateExerciseWithContextResponse extends ResponseBase {
    exercise?: Omit<ExerciseDocument, '_id' | 'exerciseSetId' | 'order'>;
}
