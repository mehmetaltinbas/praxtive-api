import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/strategies/type/exercise-set-type-strategy.interface';
import { EvaluateAnswerStrategyResponse } from 'src/exercise/strategies/type/types/evaluate-answer-strategy.response';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';

@Injectable()
export class TrueFalseExerciseSetTypeStrategy implements ExerciseSetTypeStrategy {
    type = ExerciseSetType.TRUE_FALSE;

    constructor(private openaiService: AiService) {}

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const chosenIndex = Number(answer);

        // const prompt = `choices: ['false', 'true']\n
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
