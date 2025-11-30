import * as mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        exerciseSetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExerciseSet',
            required: true,
        },
        type: {
            type: String,
            enum: ['mcq', 'trueFalse', 'short', 'openEnded'],
            required: true,
        },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        prompt: { type: String, required: true },
        solution: String, // for 'short' and 'openEnded', also can be considered for 'mcq' and 'trueFalse' for explanations of the correct choice
        choices: [String], // for 'mcq' and 'trueFalse'
        correctChoiceIndex: Number, // for 'mcq' and 'trueFalse
    },
    { timestamps: true }
);

export const ExerciseModel = mongoose.model('Exercise', schema);
