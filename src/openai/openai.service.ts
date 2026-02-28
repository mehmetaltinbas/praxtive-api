import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EvaluateExerciseAnswerResponse } from 'src/openai/types/response/evaluate-exercise-answer.response';
import { ExerciseDocument } from '../exercise/types/exercise-document.interface';
import { ExerciseDifficulty } from '../exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from '../exercise/enums/exercise-type.enum';
import { GenerateExercisesResponse, OpenaiCompletionResponse } from './types/openai-responses';

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

    async test(): Promise<OpenaiCompletionResponse> {
        const prompt = `Give flight status for TK123.`;

        const schema = {
            name: 'flight_status',
            schema: {
                type: 'object',
                properties: {
                    flightNumber: { type: 'string' },
                    status: {
                        type: 'string',
                        enum: ['scheduled', 'delayed', 'departed'],
                    },
                    delayMinutes: { type: 'number' },
                },
                required: ['flightNumber', 'status', 'delayMinutes'],
                additionalProperties: false,
            },
        };

        const response = await this.openaiClient.responses.create({
            model: this.model,
            input: [
                {
                    role: 'system',
                    content: 'Return only valid JSON matching the schema.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            text: {
                format: { type: 'json_schema', name: 'schema', schema },
            },
        });

        const result = response as object;

        console.log(result);

        return {
            isSuccess: true,
            message: 'success',
            completion: JSON.stringify(result),
        };
    }

    async generateExercises(
        text: string,
        type: string,
        difficulty: ExerciseDifficulty,
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
                        Return only valid JSON. Do not include extra text or formatting.\n
                        prompt means the the stem of the exercise (questionText)\n
                        also make sure for mcq or for trueFalse the correctChoiceIndex is not undefined\n
                        for openEnded the solution (answer) is in any length\n
                        make sure openEnded exercise type's solution is not undefined\n
                        for trueFalse, correctChoiceIndex = 0 indicates false, and 1 indicates true`,
                },
            ],
        });

        const exercises = JSON.parse(completion.choices[0].message.content!) as ExerciseDocument[];

        exercises.forEach((exercise) => {
            exercise.type = type as ExerciseType;
            exercise.difficulty = difficulty as ExerciseDifficulty;

            if (exercise.type === ExerciseType.MCQ) {
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
