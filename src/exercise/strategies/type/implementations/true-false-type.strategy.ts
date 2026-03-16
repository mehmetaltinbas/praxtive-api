import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class TrueFalseExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.TRUE_FALSE;

    constructor(private openaiService: AiService) {}

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

    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number,
        availableHeight: number
    ): void {
        let requiredHeight = document.heightOfString(`${index + 1} - ${exercise.prompt}`, { width: usableWidth });

        requiredHeight += document.currentLineHeight();

        requiredHeight += document.heightOfString('   True / False', { width: usableWidth });

        requiredHeight += document.currentLineHeight();

        if (requiredHeight > availableHeight) {
            document.addPage();
        }

        document
            .font('Times-Bold')
            .fontSize(12)
            .text(`${index + 1} - `, { continued: true })
            .font('Times-Roman')
            .text(exercise.prompt);

        document.moveDown(1);

        document.text(`   True / False`);
    }
}
