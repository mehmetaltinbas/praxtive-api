import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateAiExerciseSchema } from 'src/ai/types/generate-ai-exercise-schema.interface';
import { EvaluateExerciseAnswerResponse } from 'src/ai/types/response/evaluate-exercise-answer.response';
import { ExtractedPaperAnswer } from 'src/ai/types/response/extract-paper-answers.response';
import { AiGeneratedExercise, AiGeneratedExercisesResponse } from 'src/ai/types/response/generate-exercises.response';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { MULTIPLE_CHOICE_CHOICES_COUNT } from 'src/exercise/constants/multiple-choice-choices-count.constant';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseService } from 'src/exercise/exercise.service';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { ALLOWED_AUDIO_EXTRACTOR_MIMETYPES } from 'src/source/constants/allowed-audio-extractor-mimetypes.constant';
import { SourceTextNode } from 'src/source/types/source-text-node/source-text-node.interface';

@Injectable()
export class AiService {
    private readonly openaiApiKey: string;
    private readonly openaiClient: OpenAI;
    private readonly openaiModel = 'gpt-4.1-mini';

    constructor(
        private configService: ConfigService,
        private exerciseService: ExerciseService
    ) {
        this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY')!;
        this.openaiClient = new OpenAI({
            apiKey: this.openaiApiKey,
        });
    }

    async generateExercises(
        text: string,
        type: ExerciseSetType,
        difficulty: ExerciseSetDifficulty,
        count: number
    ): Promise<AiGeneratedExercisesResponse> {
        const exerciseTypes = Object.values(ExerciseType);
        const exerciseDifficulties = Object.values(ExerciseDifficulty);

        const isMixType = type === ExerciseSetType.MIX;
        const isMixDifficulty = difficulty === ExerciseSetDifficulty.MIX;

        const countPerGroup = new Map<string, { type: ExerciseType; difficulty: ExerciseDifficulty; count: number }>();

        for (let i = 0; i < count; i++) {
            const exerciseType = isMixType
                ? exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)]
                : (type as unknown as ExerciseType);

            const exerciseDifficulty = isMixDifficulty
                ? exerciseDifficulties[Math.floor(Math.random() * exerciseDifficulties.length)]
                : (difficulty as unknown as ExerciseDifficulty);

            const key = `${exerciseType}-${exerciseDifficulty}`;
            const group = countPerGroup.get(key);

            if (group) {
                group.count++;
            } else {
                countPerGroup.set(key, { type: exerciseType, difficulty: exerciseDifficulty, count: 1 });
            }
        }

        const batchPromises = Array.from(countPerGroup.values()).map((group) =>
            this.generateExercisesForSingleType(text, group.type, group.difficulty, group.count)
        );

        const batches = await Promise.all(batchPromises);
        const exercises = batches.flat();

        return { isSuccess: true, message: 'Exercises successfully generated.', exercises };
    }

    async generateAdditionalExercises(
        text: string,
        type: ExerciseSetType,
        difficulty: ExerciseSetDifficulty,
        count: number,
        existingExercisePrompts: string[]
    ): Promise<AiGeneratedExercisesResponse> {
        const exerciseTypes = Object.values(ExerciseType);
        const exerciseDifficulties = Object.values(ExerciseDifficulty);

        const isMixType = type === ExerciseSetType.MIX;
        const isMixDifficulty = difficulty === ExerciseSetDifficulty.MIX;

        const countPerGroup = new Map<string, { type: ExerciseType; difficulty: ExerciseDifficulty; count: number }>();

        for (let i = 0; i < count; i++) {
            const exerciseType = isMixType
                ? exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)]
                : (type as unknown as ExerciseType);

            const exerciseDifficulty = isMixDifficulty
                ? exerciseDifficulties[Math.floor(Math.random() * exerciseDifficulties.length)]
                : (difficulty as unknown as ExerciseDifficulty);

            const key = `${exerciseType}-${exerciseDifficulty}`;
            const group = countPerGroup.get(key);

            if (group) {
                group.count++;
            } else {
                countPerGroup.set(key, { type: exerciseType, difficulty: exerciseDifficulty, count: 1 });
            }
        }

        const batchPromises = Array.from(countPerGroup.values()).map((group) =>
            this.generateExercisesForSingleType(
                text,
                group.type,
                group.difficulty,
                group.count,
                existingExercisePrompts
            )
        );

        const batches = await Promise.all(batchPromises);
        const exercises = batches.flat();

        return { isSuccess: true, message: 'Additional exercises successfully generated.', exercises };
    }

    private async generateExercisesForSingleType(
        text: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty,
        count: number,
        existingExercisePrompts?: string[]
    ): Promise<AiGeneratedExercise[]> {
        let prompt = `Here is a document: "\n${text}\n"\nGenerate clear ${type} type, in ${difficulty} difficulty, ${count} number of relevant questions from the provided text to test comprehension.`;

        if (existingExercisePrompts && existingExercisePrompts.length > 0) {
            const existingList = existingExercisePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n');

            prompt += `\n\nThe following questions have already been generated from this document. Generate NEW questions that cover DIFFERENT parts and topics of the text not yet tested by these existing questions:\n\nExisting questions:\n${existingList}`;
        }

        const schema: GenerateAiExerciseSchema = {
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

        this.exerciseService.buildRestOfGenerateAiExerciseSchema(schema, type);

        const exercises = (
            await this.sendPromptAndParseResponse<{ items: AiGeneratedExercise[] }>(
                prompt,
                schema as unknown as Record<string, unknown>
            )
        ).items;

        if (type === ExerciseType.MULTIPLE_CHOICE) {
            exercises.forEach((exercise) => {
                const correctChoiceIndex = exercise.correctChoiceIndex!;
                const randomIndex = Math.floor(Math.random() * MULTIPLE_CHOICE_CHOICES_COUNT);
                const temporaryElement = exercise.choices![randomIndex];

                exercise.choices![randomIndex] = exercise.choices![correctChoiceIndex];
                exercise.choices![correctChoiceIndex] = temporaryElement;
                exercise.correctChoiceIndex = randomIndex;
            });
        }

        return exercises;
    }

    async evaluateExerciseAnswer(
        exercise: ExerciseDocument,
        customPrompt: string
    ): Promise<EvaluateExerciseAnswerResponse> {
        const prompt = `Evaluate the user's answer and provide brief feedback in simple English for this ${exercise.type} exercise.
            ### Evaluation Rules:
            - **Scoring:** Assign a score from 0-100.
            - **Content over Form:** Score purely on conceptual accuracy. Do NOT penalize for grammar, spelling, or incomplete sentences.
            - **Meaning Matching:** Award a full score if the core concept matches the correct answer, even if phrased differently.
            - **Strict Focus:** Evaluate the *intent* and *logic* of the answer, not the writing style.
            - **Feedback:** Be concise. Specifically highlight what is missing or what was misunderstood.

            ### Context:
            - **Exercise Stem:** ${exercise.prompt}
            - ${customPrompt}
        `;

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

        const response = await this.sendPromptAndParseResponse<EvaluateExerciseAnswerResponse>(prompt, schema);

        return {
            isSuccess: true,
            message: 'evaluation for openai is done',
            score: response.score,
            feedback: response.feedback,
        };
    }

    async transcribeAudio(fileBuffer: Buffer, mimetype: string): Promise<string> {
        const extension = ALLOWED_AUDIO_EXTRACTOR_MIMETYPES[mimetype] ?? 'webm';
        const arrayBuffer = Buffer.from(fileBuffer).buffer;
        const file = new File([arrayBuffer], `audio.${extension}`, { type: mimetype });

        const transcription = await this.openaiClient.audio.transcriptions.create({
            model: 'whisper-1',
            file,
        });

        return transcription.text;
    }

    async convertTextIntoSourceTextNode(text: string): Promise<SourceTextNode> {
        const prompt = `
            Convert the following plain text into a structured document node in a most meaningful way.

            Rules:
            - Split the text into block nodes for next lines.
            - Each block contains inline nodes (words or phrases that share the same style).
            - Detect formatting intent: headings/titles → fontSize "title"; subtitles → fontSize "subTitle"; body text → fontSize "body".
            - Default styles: fontSize "body", bold false, italic false.

            Text:
            """${text}"""
        `;

        const schema = {
            type: 'object',
            properties: {
                content: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            content: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        styles: {
                                            type: 'object',
                                            properties: {
                                                fontSize: { type: 'string', enum: ['title', 'subTitle', 'body'] },
                                                bold: { type: 'boolean' },
                                                italic: { type: 'boolean' },
                                            },
                                            required: ['fontSize', 'bold', 'italic'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['text', 'styles'],
                                    additionalProperties: false,
                                },
                            },
                        },
                        required: ['content'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['content'],
            additionalProperties: false,
        };

        const response = await this.sendPromptAndParseResponse<SourceTextNode>(prompt, schema);

        return response;
    }

    async extractAnswersFromPaperImages(
        imageBuffers: { buffer: Buffer; mimetype: string }[],
        exerciseSummary: string
    ): Promise<ExtractedPaperAnswer[]> {
        const imageContentParts: OpenAI.Responses.ResponseInputContent[] = imageBuffers.map((img) => ({
            type: 'input_image' as const,
            image_url: `data:${img.mimetype};base64,${img.buffer.toString('base64')}`,
            detail: 'high' as const,
        }));

        const schema = {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            exerciseNumber: { type: 'integer' },
                            answer: { type: 'string' },
                        },
                        required: ['exerciseNumber', 'answer'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['items'],
            additionalProperties: false,
        };

        const response = await this.openaiClient.responses.create({
            model: 'gpt-4.1',
            input: [
                {
                    role: 'system',
                    content:
                        'You are an answer extraction assistant. Look at the provided images of a completed paper exam and extract the answers for each exercise. Return only valid JSON matching the schema.',
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text' as const,
                            text: `Here are the exercises on the paper:\n\n${exerciseSummary}\n\nExtract the handwritten answers from the images for each exercise number.`,
                        },
                        ...imageContentParts,
                    ],
                },
            ],
            text: {
                format: { type: 'json_schema', name: 'schema', schema },
            },
        });

        const result = JSON.parse(response.output_text) as { items: ExtractedPaperAnswer[] };

        return result.items;
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
