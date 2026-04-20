import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/exercise-set-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class OpenEndedExerciseSetTypeStrategy implements ExerciseSetTypeStrategy {
    type = ExerciseSetType.OPEN_ENDED;

    constructor(private aiService: AiService) {}

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
}
