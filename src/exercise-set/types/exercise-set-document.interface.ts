import { Document as MongooseDocument } from 'mongoose';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';

export interface ExerciseSetDocument extends MongooseDocument {
    _id: string;
    sourceType: ExerciseSetSourceType;
    sourceId: string;
    type: string;
    difficulty: string;
    count: number;
    title: string;
}
