import { BadRequestException, Injectable } from '@nestjs/common';
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
}
