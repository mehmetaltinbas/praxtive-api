import { BadRequestException, Injectable } from '@nestjs/common';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import {
    AdditionalExercisesContextResult,
    ChangeContextResult,
    CreateContextResult,
    ExerciseSetContextTypeStrategy,
} from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategy.interface';

@Injectable()
export class IndependentExerciseSetContextTypeStrategy implements ExerciseSetContextTypeStrategy {
    readonly type = ExerciseSetContextType.INDEPENDENT;

    async resolveCreateContext(): Promise<CreateContextResult> {
        return {
            contextType: ExerciseSetContextType.INDEPENDENT,
        };
    }

    async resolveAdditionalExercisesContext(): Promise<AdditionalExercisesContextResult> {
        throw new BadRequestException('Additional exercises can only be generated for SOURCE type exercise sets.');
    }

    async resolveChangeContext(): Promise<ChangeContextResult> {
        return { contextId: undefined };
    }

    async resolvePdfContextTitle(): Promise<string> {
        return ExerciseSetContextType.INDEPENDENT;
    }
}
