import { Injectable } from '@nestjs/common';
import { EvaluateAnswerStrategyResponse } from 'src/exercise-set/types/response/evaluate-answer-strategy-response';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/types/strategy/exercise-set-type.strategy.interface';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { OpenaiService } from 'src/openai/openai.service';

@Injectable()
export class OpenEndedTypeStrategyProvider implements ExerciseSetTypeStrategy {
    constructor(private openaiService: OpenaiService) {}

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const prompt = `I want you to evaluate user's answer and provide feedback for this openEnded question exercise.
            question: ${exercise.prompt} \n\n
            user's answer: ${answer}\n ${exercise.solution ? `the solution: ${exercise.solution}` : ''} \n\n
            so, depending on all this info, give user's answer a score out of 100 integer, and provide a feedback\n
            your output should match this JSON interface: { score: number, feedback: string }\n
            Return only valid JSON. Do not include extra text or formatting!`;
        const evaluationResponse = await this.openaiService.evaluateExerciseAnswer(prompt);

        if (!evaluationResponse.isSuccess) return { isSuccess: false, message: evaluationResponse.message };

        return {
            isSuccess: true,
            message: 'evaluating answer is done',
            score: evaluationResponse.score,
            feedback: evaluationResponse.feedback,
        };
    }
}
