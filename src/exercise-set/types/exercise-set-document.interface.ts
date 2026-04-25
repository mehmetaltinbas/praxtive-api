import { Document as MongooseDocument } from 'mongoose';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';

export interface ExerciseSetDocument extends MongooseDocument {
    _id: string;
    user: string;
    contextType: ExerciseSetContextType;
    contextId: string;
    type: ExerciseSetType;
    difficulty: ExerciseSetDifficulty;
    count: number;
    title: string;
    visibility: ExerciseSetVisibility;
}
