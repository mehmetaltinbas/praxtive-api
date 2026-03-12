import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';
import { ExerciseTypeStrategy } from 'src/exercise/strategies/type/exercise-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { CreateExerciseDto } from 'src/exercise/types/dto/create-exercise.dto';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class MCQExerciseTypeStrategy implements ExerciseTypeStrategy {
    type = ExerciseType.MCQ;

    constructor(private openaiService: AiService) {}

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
}
