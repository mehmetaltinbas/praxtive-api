import { Document as MongooseDocument } from 'mongoose';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export interface ExerciseSetDocument extends MongooseDocument {
    _id: string;
    userId: string;
    sourceType: ExerciseSetSourceType;
    sourceId: string;
    type: ExerciseType;
    difficulty: string;
    count: number;
    title: string;
}
