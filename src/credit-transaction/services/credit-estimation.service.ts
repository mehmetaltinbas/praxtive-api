import { Injectable } from '@nestjs/common';
import { buildExtractPaperAnswersPrompt } from 'src/ai/prompts/extract-paper-answers.prompt';
import { buildGenerateExercisesPrompt } from 'src/ai/prompts/generate-exercises.prompt';
import { buildGenerateLectureNotesPrompt } from 'src/ai/prompts/generate-lecture-notes.prompt';
import { TokenCounterService } from 'src/ai/services/token-counter.service';
import { AI_MAX_OUTPUT_TOKENS } from 'src/credit-transaction/constants/ai-max-output-tokens.constant';
import { AUDIO_CREDIT_RATE_PER_SECOND } from 'src/credit-transaction/constants/credit-rates/audio-credit-rate-per-second.constant';
import { INPUT_TOKEN_CREDIT_RATE } from 'src/credit-transaction/constants/credit-rates/input-token-credit-rate.constant';
import { OUTPUT_TOKEN_CREDIT_RATE } from 'src/credit-transaction/constants/credit-rates/output-token-credit-rate.constant';
import { VISION_TOKENS_PER_IMAGE } from 'src/credit-transaction/constants/vision-tokens-per-image.constant';
import { CreditEstimateResponse } from 'src/credit-transaction/types/response/credit-estimate.response';
import { ExerciseGenerationMode } from 'src/exercise-set/enums/exercise-generation-mode.enum';
import { EstimateEvaluatePaperAnswersDto } from 'src/exercise-set/types/dto/estimate-evaluate-paper-answers.dto';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

@Injectable()
export class CreditEstimationService {
    constructor(private tokenCounterService: TokenCounterService) {}

    async estimateAudioTranscription(durationSeconds: number): Promise<CreditEstimateResponse> {
        const credits = Math.ceil(durationSeconds * AUDIO_CREDIT_RATE_PER_SECOND);

        return {
            isSuccess: true,
            message: 'Audio transcription cost estimated.',
            credits,
            breakdown: { durationSeconds, ratePerSecond: AUDIO_CREDIT_RATE_PER_SECOND },
        };
    }

    async estimateExerciseSetGeneration(
        text: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty,
        count: number,
        generationMode: ExerciseGenerationMode
    ): Promise<CreditEstimateResponse> {
        const prompt = buildGenerateExercisesPrompt(text, type, difficulty, count, generationMode);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const maxOutputTokens = count * AI_MAX_OUTPUT_TOKENS.exerciseGeneration;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Exercise set generation cost estimated.',
            credits,
            breakdown: { inputTokens, maxOutputTokens },
        };
    }

    async estimateAdditionalExerciseGeneration(
        text: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty,
        count: number,
        generationMode: ExerciseGenerationMode,
        existingPrompts: string[]
    ): Promise<CreditEstimateResponse> {
        const prompt = buildGenerateExercisesPrompt(text, type, difficulty, count, generationMode, existingPrompts);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const maxOutputTokens = count * AI_MAX_OUTPUT_TOKENS.additionalExerciseGeneration;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Additional exercise generation cost estimated.',
            credits,
            breakdown: { inputTokens, maxOutputTokens },
        };
    }

    async estimatePaperVisionExtraction(
        dto: EstimateEvaluatePaperAnswersDto,
        exerciseSummary: string,
        exerciseCount: number
    ): Promise<CreditEstimateResponse> {
        const { tokenCount: textTokens } = await this.tokenCounterService.countTokens(
            buildExtractPaperAnswersPrompt(exerciseSummary)
        );
        const imageTokens = dto.imageCount * VISION_TOKENS_PER_IMAGE;
        const inputTokens = textTokens + imageTokens;
        const maxOutputTokens = exerciseCount * AI_MAX_OUTPUT_TOKENS.paperVisionExtraction;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Paper vision extraction cost estimated.',
            credits,
            breakdown: { inputTokens, imageCount: dto.imageCount, exerciseCount, maxOutputTokens },
        };
    }

    async estimateLectureNotesGeneration(
        exerciseData: { prompt: string; answer: string }[]
    ): Promise<CreditEstimateResponse> {
        const prompt = buildGenerateLectureNotesPrompt(exerciseData);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const exerciseCount = exerciseData.length;
        const maxOutputTokens = exerciseCount * AI_MAX_OUTPUT_TOKENS.lectureNotesGeneration;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Lecture notes generation cost estimated.',
            credits,
            breakdown: { inputTokens, exerciseCount, maxOutputTokens },
        };
    }

    private calculateCredits(inputTokens: number, maxOutputTokens: number): number {
        return Math.ceil(inputTokens * INPUT_TOKEN_CREDIT_RATE + maxOutputTokens * OUTPUT_TOKEN_CREDIT_RATE);
    }
}
