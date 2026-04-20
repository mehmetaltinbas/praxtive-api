import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export function buildEvaluateAnswerPrompt(exerciseType: ExerciseType, exercisePrompt: string, customPrompt: string): string {
    return `Evaluate the user's answer and provide brief feedback in simple English for this ${exerciseType} exercise.
            ### Evaluation Rules:
            - **Scoring:** Assign a score from 0-100.
            - **Content over Form:** Score purely on conceptual accuracy. Do NOT penalize for grammar, spelling, or incomplete sentences.
            - **Meaning Matching:** Award a full score if the core concept matches the correct answer, even if phrased differently.
            - **Strict Focus:** Evaluate the *intent* and *logic* of the answer, not the writing style.
            - **Feedback:** Be concise. Specifically highlight what is missing or what was misunderstood.

            ### Context:
            - **Exercise Stem:** ${exercisePrompt}
            - ${customPrompt}
        `;
}
