export function buildGenerateLectureNotesPrompt(exerciseData: { prompt: string; answer: string }[]): string {
    const exerciseList = exerciseData.map((e, i) => `${i + 1}. Q: ${e.prompt}\n   A: ${e.answer}`).join('\n');

    return `You are an expert educator. Based on the following exercise exercises and their correct answers, generate lecture notes.
            Exercises:
            ${exerciseList}

            Instructions:
            - Generate a concise, descriptive title for the overall lecture notes based on the whole exercise set.
            - For EACH exercise, generate a subtitle and its corresponding content that explains the concept being tested.
            - The content for each exercise should teach the underlying concept and explain why the answer is correct.
            - Return the notes as an array of sections, one per exercise, each with a subtitle and content.
        `;
}
