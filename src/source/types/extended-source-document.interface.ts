import { ExerciseSetDocument } from '../../exercise-set/types/exercise-set-document.interface';
import { SourceDocument } from './source-document.interface';

export interface ExtendedSourceDocument extends SourceDocument {
    exerciseSets?: ExerciseSetDocument[];
}
