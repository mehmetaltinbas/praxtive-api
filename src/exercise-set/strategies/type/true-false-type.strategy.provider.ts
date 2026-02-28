import { Injectable } from '@nestjs/common';
import { EvaluateAnswerStrategyResponse } from 'src/exercise-set/types/response/evaluate-answer-strategy-response';
import { ExerciseSetTypeStrategy } from 'src/exercise-set/types/strategy/exercise-set-type.strategy.interface';
import { ExerciseDocument } from 'src/exercise/types/exercise-document.interface';
import { OpenaiService } from 'src/openai/openai.service';

@Injectable()
export class TrueFalseTypeStrategyProvider implements ExerciseSetTypeStrategy {
    constructor(private openaiService: OpenaiService) {}

    async evaluateAnswer(exercise: ExerciseDocument, answer: string): Promise<EvaluateAnswerStrategyResponse> {
        const chosenIndex = Number(answer);
        const prompt = `I want you to evaluate user's answer and provide feedback for this trueFalse exercise.
            arguement to check whether it is true or false: ${exercise.prompt} \n\n choices: \n${exercise.choices.map((choice, index) => `${index} -> ${choice}\n`).join('')}\n
            correctChoiceIndex: ${exercise.correctChoiceIndex} \n user's answer index: ${chosenIndex}\n ${exercise.solution ? `the solution: ${exercise.solution}` : ''} \n\n
            so, depending on all this info, give user's answer a score out of 100 integer, and provide a feedback\n
            your output should match this JSON interface: { score: number, feedback: string }\n
            (score is 100 if user selected correctly, 0 if selected wrongly)\n
            Return only valid JSON. Do not include extra text or formatting!`;
        const evaluationResponse = await this.openaiService.evaluateExerciseAnswer(prompt);

        if (!evaluationResponse.isSuccess) return { isSuccess: false, message: evaluationResponse.message };
        const score = exercise.correctChoiceIndex === chosenIndex ? 100 : 0;

        return {
            isSuccess: true,
            message: 'evaluating answer is done',
            score,
            feedback: evaluationResponse.feedback,
        };
    }
}
