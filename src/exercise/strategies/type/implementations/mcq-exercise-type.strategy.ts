import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { AiService } from 'src/ai/ai.service';
import { GenerateAiExerciseSchema } from 'src/ai/types/generate-ai-exercise-schema.interface';
import { AiGeneratedExercise } from 'src/ai/types/response/generate-exercises.response';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { getAlphabetLetter } from 'src/shared/utils/get-alphabet-letter.util';

@Injectable()
export class MCQExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.MCQ;

    constructor(@Inject(forwardRef(() => AiService)) private openaiService: AiService) {}

    buildRestOfGenerateAiExerciseSchema(schema: GenerateAiExerciseSchema): void {
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
    }

    buildCreateExerciseDto(dto: CreateExerciseDto, exercise: AiGeneratedExercise): void {
        dto.choices = exercise.choices;
        dto.correctChoiceIndex = exercise.correctChoiceIndex;
    }

    validateFields(fields: { choices?: string[]; correctChoiceIndex?: number; solution?: string }): void {
        if (!fields.choices || fields.choices.length !== MCQ_CHOICES_COUNT) {
            throw new BadRequestException(
                `${ExerciseType.MCQ} exercises must have exactly ${MCQ_CHOICES_COUNT} choices`
            );
        }

        if (fields.correctChoiceIndex === undefined || fields.correctChoiceIndex < 0 || fields.correctChoiceIndex > 4) {
            throw new BadRequestException(
                `${ExerciseType.MCQ} exercises must have a correctChoiceIndex between 0 and 4`
            );
        }
    }

    getCreateExerciseData(dto: CreateExerciseDto): Record<string, unknown> {
        return { choices: dto.choices, correctChoiceIndex: dto.correctChoiceIndex };
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
        const choiceLabels = exercise.choices!.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`);

        return `Exercise ${exerciseNumber} (MCQ): "${exercise.prompt}"\nChoices: ${choiceLabels.join(', ')}\nReturn the selected letter (A-E).`;
    }

    normalizePaperAnswer(rawAnswer: string): string {
        const letter = rawAnswer.trim().toUpperCase();
        const index = letter.charCodeAt(0) - 65;

        if (index >= 0 && index < MCQ_CHOICES_COUNT) {
            return index.toString();
        }

        return rawAnswer;
    }

    getCorrectAnswerText(exercise: ExerciseDocument): string {
        return getAlphabetLetter(exercise.correctChoiceIndex!);
    }

    drawExerciseToPdf(
        exercise: ExerciseDocument,
        index: number,
        document: typeof PDFDocument,
        usableWidth: number,
        availableHeight: number
    ): void {
        let requiredHeight = document.heightOfString(`${index + 1} - ${exercise.prompt}`, { width: usableWidth });

        // Add space for the 1 line break
        requiredHeight += document.currentLineHeight();

        exercise.choices!.forEach((choice, cIndex) => {
            requiredHeight += document.heightOfString(`   ${getAlphabetLetter(cIndex)} - ${choice}`, {
                width: usableWidth,
            });
        });

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

        // Draw the 1 line break
        document.moveDown(1);

        exercise.choices!.forEach((choice, cIndex) => {
            const letter = getAlphabetLetter(cIndex);

            document.text(`   ${letter} - ${choice}`);
        });
    }
}
