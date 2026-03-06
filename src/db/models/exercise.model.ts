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
        solution: String, // required for 'openEnded'
        choices: [String], // required for 'mcq', there has to be exactly 5 options, option count can be controlled with a constant stored in exercise/constants/
        correctChoiceIndex: Number, // required for 'mcq' and 'trueFalse, for mcq it has to be in range from 0 to 4; in for trueFalse it has to be 0 or 1, 0 indicating false, 1 indicating true
    },
    { timestamps: true }
);

export const ExerciseModel = mongoose.model('Exercise', schema);
