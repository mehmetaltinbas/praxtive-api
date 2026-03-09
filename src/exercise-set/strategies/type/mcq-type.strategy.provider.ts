import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { EvaluateAnswerStrategyResponse } from 'src/exercise-set/types/response/evaluate-answer-strategy-response';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/types/strategy/exercise-set-type.strategy.interface';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class MCQTypeStrategyProvider implements ExerciseSetTypeStrategy {
    constructor(private openaiService: AiService) {}

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const chosenIndex = Number(answer);

        // const prompt = `choices:\n${exercise.choices!.map((choice, index) => `${index} -> ${choice}\n`).join('')}\n
        //     correct choice index: ${exercise.correctChoiceIndex} \n user's answer index: ${chosenIndex}`;

        // const evaluationResponse = await this.openaiService.evaluateExerciseAnswer(exercise, prompt);

        // if (!evaluationResponse.isSuccess) return { isSuccess: false, message: evaluationResponse.message };

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
