import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateExercisesResponse, OpenaiCompletionResponse } from './types/openai-responses';
import { ExerciseDocument } from '../exercise/types/exercise-document.interface';
import { EvaluateExerciseAnswerResponse } from 'src/openai/types/response/evaluate-exercise-answer.response';
import { GenerateAbstractiveSummaryDto } from 'src/openai/types/dto/generate-abstractive-summary.dto';

@Injectable()
export class OpenaiService {
    private readonly openaiApiKey: string;
    private readonly openaiClient: OpenAI;
    private readonly model = 'gpt-4.1-mini';

    constructor(private configService: ConfigService) {
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY')!;
        this.openaiClient = new OpenAI({
            apiKey: this.openaiApiKey,
        });
    }

    async generateAbstractiveSummary(
        generateAbstractiveSummaryDto: GenerateAbstractiveSummaryDto
    ): Promise<OpenaiCompletionResponse> {
        const prompt = `You are a professional document analyst. Please process the following document:
                "${generateAbstractiveSummaryDto.text}"
                Your task:
                - Rearrange the content for smoother readability and logical flow. Feel free to reorder sections if needed.
                - Remove redundancies but keep all key details.
                - Include all sections and supplementary topics.
                - Add brief clarifications, examples, or context where it helps understanding.
                - Simplify complex concepts without losing important details.
                - Use a clear, professional tone appropriate for the audience.
                - Maintain factual accuracy and the original intent; do not add unrelated ideas.
                Custom behavior:
                - Tone: ${generateAbstractiveSummaryDto.tone}
                - Style: ${generateAbstractiveSummaryDto.style}
                - Perspective: ${generateAbstractiveSummaryDto.perspective}
                - Comprehensiveness: ${generateAbstractiveSummaryDto.comprehensionLevel}
                - Length: ${generateAbstractiveSummaryDto.length}
                Output format:
                interface DocumentNode { content: BlockNode[] }
                interface BlockNode { content: InlineNode[] }
                interface InlineNode { text: string; styles: Styles }
                interface Styles { 
                    fontSize: number; // in pt
                    bold: boolean; 
                    italic: boolean 
                }
                const example: DocumentNode = { // example json
                    content: [
                        { content: [ { text: "beginning of the document", styles: { fontSize: 16; bold: true; italic: false } }, ]},
                        { content: [ { text: " ", styles: { fontSize: 25; bold: true; italic: false } }, ]}, // for empty lines and spacing between lines you can use a block node like this
                        { content: [ { text: "keep going", styles: { fontSize: 11; bold: false; italic: true } }, { text: "just dont give up man", styles: { fontSize: 10; bold: false; italic: false } } ]},
                    ],
                };
                
                Return only valid JSON in SERIALIZED FORM. Do not include extra text or formatting. DO NOT INCLUDE 'json' in the beginning of json, just return the JSON in SERIALIZED FORM that is it!!!!!!`;
        const completion = await this.openaiClient.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'developer', content: 'you are an document analyst' },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        return {
            isSuccess: true,
            message: 'completion is done',
            completion: completion.choices[0].message.content!,
        };
    }

    async generateExercises(
        text: string,
        type: string,
        difficulty: string,
        count: number
    ): Promise<GenerateExercisesResponse> {
        const completion = await this.openaiClient.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'developer', content: 'you are a question generation expert' },
                {
                    role: 'user',
                    content: `here is a document: "\n${text}\n"\ngenerate clear ${type} type, in ${difficulty} difficulty, ${count} number of relevant questions from the provided text to test comprehension\n
                        your output should match one of this template depending on the type of the question:
                        for mcq (5 options): [ { prompt: string, choices: [ string, string, string, string, string], correctChoiceIndex: number }, ... ]\n
                        for trueFalse: [ { prompt: string, choices: [ false, true], correctChoiceIndex: number }, ... ]\n
                        for openEnded: [ { prompt: string, solution: string}, ... ]\n
                        for short: [ { prompt: string, solution: string}, ... ]\n
                        Return only valid JSON. Do not include extra text or formatting.\n
                        prompt means the the stem of the exercise (questionText)\n
                        also make sure for mcq or for trueFalse the correctChoiceIndex is not undefined\n
                        for openEnded the solution (answer) is in any length\n
                        for short the solution (answer) is just 1-5 words of answers (not sentences and not true false exercise)\n
                        make sure openEnded or short exercise types' solution is not undefined\n
                        for trueFalse, correctChoiceIndex = 0 indicates false, and 1 indicates true`,
                },
            ],
        });

        const exercises = JSON.parse(
            completion.choices[0].message.content!
        ) as ExerciseDocument[];
        exercises.forEach((exercise) => {
            exercise.type = type;
            exercise.difficulty = difficulty;
            if (exercise.type === 'mcq') {
                const correctChoiceIndex = exercise.correctChoiceIndex;
                const randomIndex = Math.floor(Math.random() * 5);
                const temporaryElement = exercise.choices[randomIndex];
                exercise.choices[randomIndex] = exercise.choices[correctChoiceIndex];
                exercise.choices[correctChoiceIndex] = temporaryElement;
                exercise.correctChoiceIndex = randomIndex;
            }
        });

        return {
            isSuccess: true,
            message: 'completion is done',
            exercises,
        };
    }

    async evaluateExerciseAnswer(prompt: string): Promise<EvaluateExerciseAnswerResponse> {
        const completion = await this.openaiClient.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'developer', content: 'you are a exercise answer evaluation expert' },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const response = JSON.parse(completion.choices[0].message.content!) as {
            score: number;
            feedback: string;
        };
        return {
            isSuccess: true,
            message: 'evaluation for openai is done',
            score: response.score,
            feedback: response.feedback,
        };
    }
}
