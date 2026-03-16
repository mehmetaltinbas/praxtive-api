import { BadRequestException, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class OpenEndedExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.OPEN_ENDED;

    constructor(private openaiService: AiService) {}

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

        const evaluationResponse = await this.openaiService.evaluateExerciseAnswer(exercise, prompt);

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

    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number,
        availableHeight: number
    ): void {
        let requiredHeight = document.heightOfString(`${index + 1} - ${exercise.prompt}`, { width: usableWidth });
        const solutionHeight = document.heightOfString(exercise.solution || '', { width: usableWidth });

        requiredHeight += solutionHeight + document.currentLineHeight();

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

        document.y += solutionHeight + document.currentLineHeight();
    }
}
