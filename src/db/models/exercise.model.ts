import * as mongoose from 'mongoose';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

const schema = new mongoose.Schema(
    {
        exerciseSetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExerciseSet',
            required: true,
        },
        prompt: { type: String, required: true },
        type: {
            type: String,
            enum: Object.values(ExerciseType),
            required: true,
        },
        difficulty: { type: String, enum: Object.values(ExerciseDifficulty), default: 'medium' },
        order: {
            // index based integer
            type: Number,
            required: true,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer value',
            },
        },
        solution: String, // required for 'openEnded'
        choices: [String], // required for 'mcq', there has to be exactly 5 options, option count can be controlled with a constant stored in exercise/constants/
        correctChoiceIndex: {
            type: Number,
            min: 0,
            max: MCQ_CHOICES_COUNT - 1,
            validate: {
                validator: Number.isInteger,
                message: 'Index must be an integer',
            },
        }, // required for 'mcq' and 'trueFalse, for mcq it has to be in range from 0 to 4; in for trueFalse it has to be 0 or 1, 0 indicating false, 1 indicating true
    },
    { timestamps: true }
);

export const ExerciseModel = mongoose.model('Exercise', schema);
