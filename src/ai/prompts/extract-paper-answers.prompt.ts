export function buildExtractPaperAnswersPrompt(exerciseSummary: string): string {
    return `Here are the exercises on the paper:\n\n${exerciseSummary}\n\nExtract the handwritten answers from the images for each exercise number.`;
}
