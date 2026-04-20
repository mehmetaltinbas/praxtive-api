import { Injectable } from '@nestjs/common';
import { buildExtractPaperAnswersPrompt } from 'src/ai/prompts/extract-paper-answers.prompt';
import { buildGenerateExercisesPrompt } from 'src/ai/prompts/generate-exercises.prompt';
import { buildGenerateLectureNotesPrompt } from 'src/ai/prompts/generate-lecture-notes.prompt';
import { TokenCounterService } from 'src/ai/services/token-counter.service';
import { AUDIO_RATE_PER_SECOND } from 'src/billing/constants/credit-rates/audio-rate-per-second.constant';
import { INPUT_TOKEN_RATE } from 'src/billing/constants/credit-rates/input-token-rate.constant';
import { MAX_OUTPUT_TOKENS } from 'src/billing/constants/credit-rates/max-output-tokens.constant';
import { OUTPUT_TOKEN_RATE } from 'src/billing/constants/credit-rates/output-token-rate.constant';
import { VISION_TOKENS_PER_IMAGE } from 'src/billing/constants/credit-rates/vision-tokens-per-image.constant';
import { CostEstimateResponse } from 'src/billing/types/response/cost-estimate.response';
import { EstimateEvaluatePaperAnswersDto } from 'src/exercise-set/types/dto/estimate-evaluate-paper-answers.dto';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

@Injectable()
export class CostEstimationService {
    constructor(private tokenCounterService: TokenCounterService) {}

    async estimateAudioTranscription(durationSeconds: number): Promise<CostEstimateResponse> {
        const credits = Math.ceil(durationSeconds * AUDIO_RATE_PER_SECOND);

        return {
            isSuccess: true,
            message: 'Audio transcription cost estimated.',
            credits,
            breakdown: { durationSeconds, ratePerSecond: AUDIO_RATE_PER_SECOND },
        };
    }

    async estimateExerciseSetGeneration(
        text: string,
        type: ExerciseType,
        difficulty: ExerciseDifficulty,
        count: number
    ): Promise<CostEstimateResponse> {
        const prompt = buildGenerateExercisesPrompt(text, type, difficulty, count);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const maxOutputTokens = count * MAX_OUTPUT_TOKENS.exerciseGeneration;
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
        existingPrompts: string[]
    ): Promise<CostEstimateResponse> {
        const prompt = buildGenerateExercisesPrompt(text, type, difficulty, count, existingPrompts);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const maxOutputTokens = count * MAX_OUTPUT_TOKENS.additionalExerciseGeneration;
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
        exerciseSummary: string
    ): Promise<CostEstimateResponse> {
        const { tokenCount: textTokens } = await this.tokenCounterService.countTokens(
            buildExtractPaperAnswersPrompt(exerciseSummary)
        );
        const imageTokens = dto.imageCount * VISION_TOKENS_PER_IMAGE;
        const inputTokens = textTokens + imageTokens;
        const maxOutputTokens = MAX_OUTPUT_TOKENS.paperVisionExtraction;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Paper vision extraction cost estimated.',
            credits,
            breakdown: { inputTokens, imageCount: dto.imageCount, maxOutputTokens },
        };
    }

    async estimateLectureNotesGeneration(
        exerciseData: { prompt: string; answer: string }[]
    ): Promise<CostEstimateResponse> {
        const prompt = buildGenerateLectureNotesPrompt(exerciseData);
        const { tokenCount: inputTokens } = await this.tokenCounterService.countTokens(prompt);
        const maxOutputTokens = MAX_OUTPUT_TOKENS.lectureNotesGeneration;
        const credits = this.calculateCredits(inputTokens, maxOutputTokens);

        return {
            isSuccess: true,
            message: 'Lecture notes generation cost estimated.',
            credits,
            breakdown: { inputTokens, maxOutputTokens },
        };
    }

    private calculateCredits(inputTokens: number, maxOutputTokens: number): number {
        return Math.ceil(inputTokens * INPUT_TOKEN_RATE + maxOutputTokens * OUTPUT_TOKEN_RATE);
    }
}
