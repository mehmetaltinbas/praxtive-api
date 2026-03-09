import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { EvaluateAnswerStrategyResponse } from 'src/exercise-set/types/response/evaluate-answer-strategy-response';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/types/strategy/exercise-set-type.strategy.interface';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class OpenEndedTypeStrategyProvider implements ExerciseSetTypeStrategy {
    constructor(private openaiService: AiService) {}

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
