import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GenerateAiExerciseSchema } from 'src/ai/types/generate-ai-exercise-schema.interface';
import { EvaluateExerciseAnswerResponse } from 'src/ai/types/response/evaluate-exercise-answer.response';
import { ExtractedPaperAnswer } from 'src/ai/types/response/extract-paper-answers.response';
import { ExtractPaperAnswersResultResponse } from 'src/ai/types/response/extract-paper-answers-result.response';
import { AiGeneratedExercise, AiGeneratedExercisesResponse } from 'src/ai/types/response/generate-exercises.response';
import { GenerateLectureNotesResponse } from 'src/ai/types/response/generate-lecture-notes.response';
import { GenerateSingleExerciseResponse } from 'src/ai/types/response/generate-single-exercise.response';
import { TranscribeAudioResponse } from 'src/ai/types/response/transcribe-audio.response';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { MULTIPLE_CHOICE_CHOICES_COUNT } from 'src/exercise/constants/multiple-choice-choices-count.constant';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseService } from 'src/exercise/exercise.service';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { buildEvaluateAnswerPrompt } from 'src/ai/prompts/evaluate-answer.prompt';
import { buildExtractPaperAnswersPrompt } from 'src/ai/prompts/extract-paper-answers.prompt';
import { buildGenerateExercisesPrompt } from 'src/ai/prompts/generate-exercises.prompt';
import { buildGenerateLectureNotesPrompt } from 'src/ai/prompts/generate-lecture-notes.prompt';
import { ALLOWED_AUDIO_EXTRACTOR_MIMETYPES } from 'src/source/constants/allowed-audio-extractor-mimetypes.constant';

@Injectable()
export class AiService {
    private readonly openaiApiKey: string;
    private readonly openaiClient: OpenAI;
    private readonly openaiModel = 'gpt-4.1-mini';

    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => ExerciseService)) private exerciseService: ExerciseService
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
        const prompt = buildGenerateExercisesPrompt(text, type, difficulty, count, existingExercisePrompts);

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

        const exerciseTypeStrategy = this.exerciseService.resolveExerciseTypeStrategy(type);

        exerciseTypeStrategy.buildRestOfGenerateAiExerciseSchema(schema);

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

    async generateSingleExerciseWithContext(
        context: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty
    ): Promise<GenerateSingleExerciseResponse> {
        const prompt = `Here is some context provided by the user: "\n${context}\n"\nGenerate a clear ${type} type, in ${difficulty} difficulty, single relevant question from the provided context to test comprehension.`;

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

        const exerciseTypeStrategy = this.exerciseService.resolveExerciseTypeStrategy(type);

        exerciseTypeStrategy.buildRestOfGenerateAiExerciseSchema(schema);

        const exercise = (
            await this.sendPromptAndParseResponse<{ items: AiGeneratedExercise[] }>(
                prompt,
                schema as unknown as Record<string, unknown>
            )
        ).items[0];

        if (type === ExerciseType.MULTIPLE_CHOICE) {
            const correctChoiceIndex = exercise.correctChoiceIndex!;
            const randomIndex = Math.floor(Math.random() * MULTIPLE_CHOICE_CHOICES_COUNT);
            const temporaryElement = exercise.choices![randomIndex];

            exercise.choices![randomIndex] = exercise.choices![correctChoiceIndex];
            exercise.choices![correctChoiceIndex] = temporaryElement;
            exercise.correctChoiceIndex = randomIndex;
        }

        const { order, ...exerciseWithoutOrder } = exercise;

        return { isSuccess: true, message: 'Single exercise generated.', exercise: exerciseWithoutOrder };
    }

    async evaluateExerciseAnswer(
        exercise: ExerciseDocument,
        customPrompt: string
    ): Promise<EvaluateExerciseAnswerResponse> {
        const prompt = buildEvaluateAnswerPrompt(exercise.type, exercise.prompt, customPrompt);

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

    async transcribeAudio(fileBuffer: Buffer, mimetype: string): Promise<TranscribeAudioResponse> {
        const extension = ALLOWED_AUDIO_EXTRACTOR_MIMETYPES[mimetype] ?? 'webm';
        const arrayBuffer = Buffer.from(fileBuffer).buffer;
        const file = new File([arrayBuffer], `audio.${extension}`, { type: mimetype });

        const transcription = await this.openaiClient.audio.transcriptions.create({
            model: 'whisper-1',
            file,
        });

        return { isSuccess: true, message: 'Audio transcribed.', text: transcription.text };
    }

    async extractAnswersFromPaperImages(
        imageBuffers: { buffer: Buffer; mimetype: string }[],
        exerciseSummary: string
    ): Promise<ExtractPaperAnswersResultResponse> {
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
                            text: buildExtractPaperAnswersPrompt(exerciseSummary),
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

        return { isSuccess: true, message: 'Paper answers extracted.', extractedAnswers: result.items };
    }

    async generateLectureNotes(
        exerciseData: { prompt: string; answer: string }[]
    ): Promise<GenerateLectureNotesResponse> {
        const prompt = buildGenerateLectureNotesPrompt(exerciseData);

        const schema = {
            type: 'object',
            properties: {
                title: { type: 'string' },
                sections: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            subtitle: { type: 'string' },
                            content: { type: 'string' },
                        },
                        required: ['subtitle', 'content'],
                        additionalProperties: false,
                    },
                },
            },
            required: ['title', 'sections'],
            additionalProperties: false,
        };

        const result = await this.sendPromptAndParseResponse<{
            title: string;
            sections: { subtitle: string; content: string }[];
        }>(prompt, schema);

        const rawText = result.sections.map((s) => `${s.subtitle}\n${s.content}`).join('\n\n');

        return { isSuccess: true, message: 'Lecture notes generated.', title: result.title, rawText };
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
