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
export class TrueFalseExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.TRUE_FALSE;

    constructor(@Inject(forwardRef(() => AiService)) private aiService: AiService) {}

    buildRestOfGenerateAiExerciseSchema(schema: Schema): void {
        const itemSchema = schema.properties!.items.items!;

        itemSchema.properties!.correctChoiceIndex = {
            type: Type.INTEGER,
            minimum: 0,
            maximum: 1,
            description: '0 indicates false, 1 indicates true',
        };

        itemSchema.required!.push('correctChoiceIndex');
    }

    buildCreateExerciseDto(dto: CreateExerciseDto, exercise: AiGeneratedExercise): void {
        dto.correctChoiceIndex = exercise.correctChoiceIndex;
    }

    validateFields(fields: { choices?: string[]; correctChoiceIndex?: number; solution?: string }): void {
        if (
            fields.correctChoiceIndex === undefined ||
            (fields.correctChoiceIndex !== 0 && fields.correctChoiceIndex !== 1)
        ) {
            throw new BadRequestException(
                `${ExerciseType.TRUE_FALSE} exercises must have a correctChoiceIndex of 0 or 1`
            );
        }
    }

    getCreateExerciseData(dto: CreateExerciseDto): Record<string, unknown> {
        return { correctChoiceIndex: dto.correctChoiceIndex };
    }

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const chosenIndex = Number(answer);

        const isCorrect = exercise.correctChoiceIndex === chosenIndex;

        const score = isCorrect ? 100 : 0;

        return {
            isSuccess: true,
            message: 'evaluating answer is done',
            score,
            feedback: isCorrect ? 'success' : 'fail',
        };
    }

    buildPaperExtractionPrompt(exerciseNumber: number, exercise: ExerciseDocument): string {
        return `Exercise ${exerciseNumber} (True/False): "${exercise.prompt}"\nReturn "True" or "False".`;
    }

    normalizePaperAnswer(rawAnswer: string): string {
        const lower = rawAnswer.trim().toLowerCase();

        if (lower === 'true') return '1';
        if (lower === 'false') return '0';

        return rawAnswer;
    }

    getCorrectAnswerText(exercise: ExerciseDocument): string {
        return exercise.correctChoiceIndex === 1 ? 'True' : 'False';
    }

    getRequiredHeight(exercise: ExerciseDocument, document: typeof PDFDocument, usableWidth: number): number {
        let requiredHeight = document.heightOfString(exercise.prompt, { width: usableWidth });

        requiredHeight += document.currentLineHeight();

        requiredHeight += document.heightOfString('   True / False', { width: usableWidth });

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

        document.moveDown(1);

        document.text(`   True / False`);
    }
}
