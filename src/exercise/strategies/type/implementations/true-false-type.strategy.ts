import { BadRequestException, Injectable } from '@nestjs/common';
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
}
