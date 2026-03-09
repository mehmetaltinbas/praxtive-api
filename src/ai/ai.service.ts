import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EvaluateExerciseAnswerResponse } from 'src/ai/types/response/evaluate-exercise-answer.response';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { ExerciseDifficulty } from '../exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from '../exercise/enums/exercise-type.enum';
import { AiGeneratedExercise, AiGeneratedExercisesResponse } from './types/response/generate-exercises.response';

@Injectable()
export class AiService {
    private readonly openaiApiKey: string;
    private readonly openaiClient: OpenAI;
    private readonly openaiModel = 'gpt-4.1-mini';

    constructor(private configService: ConfigService) {
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY')!;
        this.openaiClient = new OpenAI({
            apiKey: this.openaiApiKey,
        });
    }

    async generateExercises(
        text: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty,
        count: number
    ): Promise<AiGeneratedExercisesResponse> {
        const prompt = `Here is a document: "\n${text}\n"\nGenerate clear ${type} type, in ${difficulty} difficulty, ${count} number of relevant questions from the provided text to test comprehension.`;

        const schema: {
            type: string;
            properties: {
                items: {
                    type: string;
                    items: {
                        type: string;
                        properties: { [key: string]: unknown };
                        required: string[];
                        additionalProperties: boolean;
                    };
                };
            };
            required: string[];
            additionalProperties: boolean;
        } = {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            prompt: { type: 'string' },
                            type: { type: 'string', enum: [type] },
                            difficulty: { type: 'string', enum: [difficulty] },
                        },
                        required: ['prompt', 'type', 'difficulty'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['items'],
            additionalProperties: false,
        };

        switch (type) {
            case ExerciseType.MCQ: {
                schema.properties.items.items.properties.choices = {
                    type: 'array',
                    minItems: MCQ_CHOICES_COUNT,
                    maxItems: MCQ_CHOICES_COUNT,
                    items: {
                        type: 'string',
                    },
                };

                schema.properties.items.items.properties.correctChoiceIndex = {
                    type: 'integer',
                    minimum: 0,
                    maximum: MCQ_CHOICES_COUNT - 1,
                };

                schema.properties.items.items.required.push('choices');
                schema.properties.items.items.required.push('correctChoiceIndex');

                break;
            }

            case ExerciseType.TRUE_FALSE: {
                schema.properties.items.items.properties.correctChoiceIndex = {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                    description: '0 indicates false, 1 indicates true',
                };

                schema.properties.items.items.required.push('correctChoiceIndex');

                break;
            }

            case ExerciseType.OPEN_ENDED: {
                schema.properties.items.items.properties.solution = {
                    type: 'string',
                };

                schema.properties.items.items.required.push('solution');

                break;
            }

            default: {
                throw new BadRequestException(`Unsupported exercise type: ${type as string}`);
            }
        }

        const exercises = (await this.sendPromptAndParseResponse<{ items: AiGeneratedExercise[] }>(prompt, schema))
            .items;

        if (type === ExerciseType.MCQ) {
            exercises.forEach((exercise) => {
                const correctChoiceIndex = exercise.correctChoiceIndex!;
                const randomIndex = Math.floor(Math.random() * MCQ_CHOICES_COUNT);
                const temporaryElement = exercise.choices![randomIndex];

                exercise.choices![randomIndex] = exercise.choices![correctChoiceIndex];
                exercise.choices![correctChoiceIndex] = temporaryElement;
                exercise.correctChoiceIndex = randomIndex;
            });
        }

        return {
            isSuccess: true,
            message: 'Exercises successfully generated.',
            exercises,
        };
    }

    async evaluateExerciseAnswer(
        exercise: ExerciseDocument,
        customPrompt: string
    ): Promise<EvaluateExerciseAnswerResponse> {
        const prompt = `Evaluate user's answer and provide feedback for this ${exercise.type} type exercise. \n
            Score is must be between 0-100. \n
            Exercise prompt (stem): ${exercise.prompt} \n\n
            ${customPrompt}`;

        const schema = {
            type: 'object',
            properties: {
                score: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 100,
                },
                feedback: { type: 'string' },
            },
            required: ['score', 'feedback'],
            additionalProperties: false,
        };

        const response = await this.sendPromptAndParseResponse<{ score: number; feedback: string }>(prompt, schema);

        return {
            isSuccess: true,
            message: 'evaluation for openai is done',
            score: response.score,
            feedback: response.feedback,
        };
    }

    async test(): Promise<object> {
        const schema = {
            type: '',
        };

        return {};

        // return await this.generateExercises(
        //     'In the frozen north, where winds howled like wolves and seas churned black, Leif Ironhand led his crew of twelve warriors across the uncharted ocean. They had sailed for nine days without sight of land, surviving on salted fish and iron will. On the tenth morning, a coastline emerged from the mist — jagged cliffs draped in green, unlike anything they had seen. Leif raised his axe to the sky and roared. His men echoed the cry, their voices swallowing the storm. They made landfall at dusk. The forest was dense, the silence heavy. Then — torches. Dozens of them, emerging from the treeline. Leif did not draw his sword. Instead, he stepped forward alone, hands open. His father had told him: the bravest thing a Viking can do is choose peace when war is easier. That night, they shared fire with strangers.',
        //     ExerciseType.OPEN_ENDED,
        //     ExerciseDifficulty.EASY,
        //     2
        // );
    }

    private async sendPromptAndParseResponse<T>(prompt: string, schema: { [key: string]: unknown }): Promise<T> {
        const response = await this.openaiClient.responses.create({
            model: this.openaiModel,
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

        const result = JSON.parse(response.output_text) as T;

        return result;
    }
}
