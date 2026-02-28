import * as mongoose from 'mongoose';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

const schema = new mongoose.Schema(
    {
        exerciseSetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExerciseSet',
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(ExerciseType),
            required: true,
        },
        difficulty: { type: String, enum: Object.values(ExerciseDifficulty), default: 'medium' },
        prompt: { type: String, required: true },
        solution: String, // for 'openEnded', also can be considered for 'mcq' and 'trueFalse' for explanations of the correct choice
        choices: [String], // for 'mcq' and 'trueFalse'
        correctChoiceIndex: Number, // for 'mcq' and 'trueFalse
    },
    { timestamps: true }
);

export const ExerciseModel = mongoose.model('Exercise', schema);
