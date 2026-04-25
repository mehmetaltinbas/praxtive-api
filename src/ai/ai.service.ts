import { GoogleGenAI, Type, type Part, type Schema } from '@google/genai';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildEvaluateAnswerPrompt } from 'src/ai/prompts/evaluate-answer.prompt';
import { buildExtractPaperAnswersPrompt } from 'src/ai/prompts/extract-paper-answers.prompt';
import { buildGenerateExercisesPrompt } from 'src/ai/prompts/generate-exercises.prompt';
import { buildGenerateLectureNotesPrompt } from 'src/ai/prompts/generate-lecture-notes.prompt';
import { EvaluateExerciseAnswerResponse } from 'src/ai/types/response/evaluate-exercise-answer.response';
import { ExtractPaperAnswersResultResponse } from 'src/ai/types/response/extract-paper-answers-result.response';
import { ExtractedPaperAnswer } from 'src/ai/types/response/extract-paper-answers.response';
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

@Injectable()
export class AiService {
    private readonly geminiApiKey: string;
    private readonly genai: GoogleGenAI;
    private readonly geminiModel = 'gemini-2.5-flash-lite';

    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => ExerciseService)) private exerciseService: ExerciseService
    ) {
        this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY')!;
        this.genai = new GoogleGenAI({ apiKey: this.geminiApiKey });
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

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: { type: Type.STRING },
                            type: { type: Type.STRING, enum: [type] },
                            difficulty: { type: Type.STRING, enum: [difficulty] },
                        },
                        required: ['prompt', 'type', 'difficulty'],
                    },
                },
            },
            required: ['items'],
        };

        const exerciseTypeStrategy = this.exerciseService.resolveExerciseTypeStrategy(type);

        exerciseTypeStrategy.buildRestOfGenerateAiExerciseSchema(schema);

        const exercises = (await this.sendPromptAndParseResponse<{ items: AiGeneratedExercise[] }>(prompt, schema))
            .items;

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

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: { type: Type.STRING },
                            type: { type: Type.STRING, enum: [type] },
                            difficulty: { type: Type.STRING, enum: [difficulty] },
                        },
                        required: ['prompt', 'type', 'difficulty'],
                    },
                },
            },
            required: ['items'],
        };

        const exerciseTypeStrategy = this.exerciseService.resolveExerciseTypeStrategy(type);

        exerciseTypeStrategy.buildRestOfGenerateAiExerciseSchema(schema);

        const exercise = (await this.sendPromptAndParseResponse<{ items: AiGeneratedExercise[] }>(prompt, schema))
            .items[0];

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
        const prompt = buildEvaluateAnswerPrompt(exercise.type, exercise.stem, customPrompt);

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                score: {
                    type: Type.INTEGER,
                    minimum: 0,
                    maximum: 100,
                },
                feedback: { type: Type.STRING },
            },
            required: ['score', 'feedback'],
        };

        const response = await this.sendPromptAndParseResponse<EvaluateExerciseAnswerResponse>(prompt, schema);

        return {
            isSuccess: true,
            message: 'evaluation is done',
            score: response.score,
            feedback: response.feedback,
        };
    }

    async transcribeAudio(fileBuffer: Buffer, mimetype: string): Promise<TranscribeAudioResponse> {
        const response = await this.genai.models.generateContent({
            model: this.geminiModel,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: 'Transcribe the audio verbatim. Return only the spoken text.' },
                        { inlineData: { mimeType: mimetype, data: fileBuffer.toString('base64') } },
                    ],
                },
            ],
        });

        return { isSuccess: true, message: 'Audio transcribed.', text: response.text ?? '' };
    }

    async extractAnswersFromPaperImages(
        imageBuffers: { buffer: Buffer; mimetype: string }[],
        exerciseSummary: string
    ): Promise<ExtractPaperAnswersResultResponse> {
        const imageParts: Part[] = imageBuffers.map((img) => ({
            inlineData: { mimeType: img.mimetype, data: img.buffer.toString('base64') },
        }));

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            exerciseNumber: { type: Type.INTEGER },
                            answer: { type: Type.STRING },
                        },
                        required: ['exerciseNumber', 'answer'],
                    },
                },
            },
            required: ['items'],
        };

        const response = await this.genai.models.generateContent({
            model: this.geminiModel,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: buildExtractPaperAnswersPrompt(exerciseSummary) }, ...imageParts],
                },
            ],
            config: {
                systemInstruction:
                    'You are an answer extraction assistant. Look at the provided images of a completed paper exam and extract the answers for each exercise. Return only valid JSON matching the schema.',
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        });

        const result = JSON.parse(response.text ?? '') as { items: ExtractedPaperAnswer[] };

        return { isSuccess: true, message: 'Paper answers extracted.', extractedAnswers: result.items };
    }

    async generateLectureNotes(
        exerciseData: { prompt: string; answer: string }[]
    ): Promise<GenerateLectureNotesResponse> {
        const prompt = buildGenerateLectureNotesPrompt(exerciseData);

        const schema: Schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                sections: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            subtitle: { type: Type.STRING },
                            content: { type: Type.STRING },
                        },
                        required: ['subtitle', 'content'],
                    },
                },
            },
            required: ['title', 'sections'],
        };

        const result = await this.sendPromptAndParseResponse<{
            title: string;
            sections: { subtitle: string; content: string }[];
        }>(prompt, schema);

        const rawText = result.sections.map((s) => `${s.subtitle}\n${s.content}`).join('\n\n');

        return { isSuccess: true, message: 'Lecture notes generated.', title: result.title, rawText };
    }

    private async sendPromptAndParseResponse<T>(prompt: string, schema: Schema): Promise<T> {
        const response = await this.genai.models.generateContent({
            model: this.geminiModel,
            contents: prompt,
            config: {
                systemInstruction: 'Return only valid JSON matching the schema.',
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        });

        return JSON.parse(response.text ?? '') as T;
    }
}
