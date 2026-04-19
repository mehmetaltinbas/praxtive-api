import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export function buildGenerateExercisesPrompt(
    text: string,
    type: ExerciseType,
    difficulty: ExerciseDifficulty,
    count: number,
    existingExercisePrompts?: string[]
): string {
    let prompt = `Here is a document: "\n${text}\n"\nGenerate clear ${type} type, in ${difficulty} difficulty, ${count} number of relevant questions from the provided text to test comprehension.`;

    if (existingExercisePrompts && existingExercisePrompts.length > 0) {
        const existingList = existingExercisePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n');

        prompt += `\n\nThe following questions have already been generated from this document. Generate NEW questions that cover DIFFERENT parts and topics of the text not yet tested by these existing questions:\n\nExisting questions:\n${existingList}`;
    }

    return prompt;
}
