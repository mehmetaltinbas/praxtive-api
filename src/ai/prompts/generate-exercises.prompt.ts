import { ExerciseGenerationMode } from 'src/exercise-set/enums/exercise-generation-mode.enum';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export function buildGenerateExercisesPrompt(
    text: string,
    type: ExerciseType,
    difficulty: ExerciseDifficulty,
    count: number,
    generationMode: ExerciseGenerationMode,
    existingExercisePrompts?: string[]
): string {
    // 1. Define the strategy-specific instructions
    const strategyInstructions =
        generationMode === ExerciseGenerationMode.CONCEPTUAL_MASTERY
            ? `
        GOAL: ACTIVE RECALL & CONCEPTUAL MASTERY
        - Do NOT ask exercises that can be answered by simply finding a sentence in the text.
        - Create NEW scenarios, NEW math problems, and NEW analogies that are not in the text but follow the same logic.
        - If the text provides an example (like a vending machine or a specific formula), you MUST invent a different example to test the user's ability to apply the concept.
        - Focus on 'Why' and 'How' rather than 'What'.`
            : `
        GOAL: DIRECT RECALL & COMPREHENSION
        - Focus on the core facts, definitions, and specific examples provided in the text.
        - Ensure the user has a solid foundational understanding of the explicit content.`;

    let prompt = `
    You are an expert educator. Your task is to generate ${count} exercises from the provided document.
    
    DOCUMENT:
    """
    ${text}
    """

    EXERCISE CONFIGURATION:
    - Type: ${type}
    - Difficulty: ${difficulty}
    - Mode: ${generationMode === ExerciseGenerationMode.CONCEPTUAL_MASTERY ? 'Application-based' : 'Fact-based'}

    INSTRUCTIONS:
    ${strategyInstructions}
    - Ensure exercises are clear, concise, and match the specified difficulty.
    - Provide the correct answer or a detailed grading rubric for open-ended exercises.`;

    if (existingExercisePrompts && existingExercisePrompts.length > 0) {
        const existingList = existingExercisePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n');

        prompt += `\n\nCRITICAL: The following exercises have already been generated. Generate entirely NEW exercises that cover different angles or deeper layers of the concept:\n\nExisting exercises:\n${existingList}`;
    }

    return prompt;
}
