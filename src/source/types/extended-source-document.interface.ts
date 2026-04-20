import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';
import { SourceDocument } from 'src/source/types/source-document.interface';

export interface ExtendedSourceDocument extends SourceDocument {
    exerciseSets?: ExerciseSetDocument[];
}
