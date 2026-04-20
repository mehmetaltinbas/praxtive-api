import { Type, type Schema } from '@google/genai';
import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { AiGeneratedExercise } from 'src/ai/types/response/generate-exercises.response';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class OpenEndedExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.OPEN_ENDED;

    constructor(@Inject(forwardRef(() => AiService)) private aiService: AiService) {}

    buildRestOfGenerateAiExerciseSchema(schema: Schema): void {
        const itemSchema = schema.properties!.items.items!;

        itemSchema.properties!.solution = {
            type: Type.STRING,
        };

        itemSchema.required!.push('solution');
    }

    buildCreateExerciseDto(dto: CreateExerciseDto, exercise: AiGeneratedExercise): void {
        dto.solution = exercise.solution;
    }

    validateFields(fields: { choices?: string[]; correctChoiceIndex?: number; solution?: string }): void {
        if (!fields.solution) {
            throw new BadRequestException(`${ExerciseType.OPEN_ENDED} exercises must have a solution`);
        }
    }

    getCreateExerciseData(dto: CreateExerciseDto): Record<string, unknown> {
        return { solution: dto.solution };
    }

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const prompt = `the correct solution: ${exercise.solution}\n user's answer: ${answer}`;

        const evaluationResponse = await this.aiService.evaluateExerciseAnswer(exercise, prompt);

        if (!evaluationResponse.isSuccess) return { isSuccess: false, message: evaluationResponse.message };

        return {
            isSuccess: true,
            message: 'evaluating answer is done',
            score: evaluationResponse.score,
            feedback: evaluationResponse.feedback,
        };
    }

    buildPaperExtractionPrompt(exerciseNumber: number, exercise: ExerciseDocument): string {
        return `Exercise ${exerciseNumber} (Open Ended): "${exercise.prompt}"\nTranscribe the handwritten answer text.`;
    }

    normalizePaperAnswer(rawAnswer: string): string {
        return rawAnswer;
    }

    getCorrectAnswerText(exercise: ExerciseDocument): string {
        return exercise.solution ?? '';
    }

    getRequiredHeight(exercise: ExerciseDocument, document: typeof PDFDocument, usableWidth: number): number {
        let requiredHeight = document.heightOfString(exercise.prompt, { width: usableWidth });
        const solutionHeight = document.heightOfString(exercise.solution || '', { width: usableWidth });

        requiredHeight += solutionHeight + document.currentLineHeight();

        requiredHeight += document.currentLineHeight();

        return requiredHeight;
    }

    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number
    ): void {
        document.font('Times-Roman').fontSize(12).text(exercise.prompt);

        const solutionHeight = document.heightOfString(exercise.solution || '', { width: usableWidth });

        document.y += solutionHeight + document.currentLineHeight();
    }
}
