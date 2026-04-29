import { MAX_SOURCE_TITLE_LENGTH } from 'src/source/constants/max-source-title-length.constant';

export function buildGenerateUnifiedNotesPrompt(exerciseData: { prompt: string; answer: string }[]): string {
    const exerciseList = exerciseData.map((e, i) => `${i + 1}. Q: ${e.prompt}\n   A: ${e.answer}`).join('\n');

    return `You are an expert educator. Use the following exercises and their correct answers as context to write cohesive lecture notes.
            Exercises:
            ${exerciseList}

            Instructions:
            - Generate a concise, descriptive title for the overall lecture notes. The title MUST be at most ${MAX_SOURCE_TITLE_LENGTH} characters.
            - Write a single, flowing lecture-note style explanation that covers the underlying concepts the exercises test.
            - Do NOT structure the notes as one section per exercise. Group related concepts naturally.
            - Use markdown for any structure you need (headings, lists); any sub-sections must reflect concepts, not individual exercises.
            - Return { title, rawText } where rawText is the full markdown body.
        `;
}
