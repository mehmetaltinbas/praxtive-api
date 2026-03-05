import { Document as MongooseDocument } from 'mongoose';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export interface ExerciseSetDocument extends MongooseDocument {
    _id: string;
    userId: string;
    sourceType: ExerciseSetSourceType;
    sourceId: string;
    type: ExerciseSetType;
    difficulty: ExerciseSetDifficulty;
    count: number;
    title: string;
}
