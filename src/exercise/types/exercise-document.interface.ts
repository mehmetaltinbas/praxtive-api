import { Document as MongooseDocument } from 'mongoose';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export interface ExerciseDocument extends MongooseDocument {
    _id: string;
    exerciseSetId: string;
    prompt: string;
    type: ExerciseType;
    difficulty: ExerciseDifficulty;
    order: number; // index based integer
    choices?: string[];
    correctChoiceIndex?: number;
    solution?: string;
}
