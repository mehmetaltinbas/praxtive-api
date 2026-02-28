import { Document as MongooseDocument } from 'mongoose';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export interface ExerciseDocument extends MongooseDocument {
    _id: string;
    exerciseSetId: string;
    type: ExerciseType;
    choices: string[];
    correctChoiceIndex: number;
    difficulty: string;
    prompt: string;
    solution: string;
}
