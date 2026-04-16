import { BadRequestException, Injectable } from '@nestjs/common';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetGroupService } from 'src/exercise-set-group/exercise-set-group.service';
import {
    AdditionalExercisesContextResult,
    ChangeContextResult,
    CreateContextResult,
    ExerciseSetContextTypeStrategy,
} from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategy.interface';

@Injectable()
export class GroupExerciseSetContextTypeStrategy implements ExerciseSetContextTypeStrategy {
    readonly type = ExerciseSetContextType.GROUP;

    constructor(private exerciseSetGroupService: ExerciseSetGroupService) {}

    async resolveCreateContext(userId: string, contextReferenceId?: string): Promise<CreateContextResult> {
        await this.exerciseSetGroupService.readById(userId, contextReferenceId!);

        return {
            contextType: ExerciseSetContextType.GROUP,
            contextId: contextReferenceId,
        };
    }

    async resolveAdditionalExercisesContext(): Promise<AdditionalExercisesContextResult> {
        throw new BadRequestException('Additional exercises can only be generated for SOURCE type exercise sets.');
    }

    async resolveChangeContext(userId: string, contextId?: string): Promise<ChangeContextResult> {
        await this.exerciseSetGroupService.readById(userId, contextId!);

        return { contextId };
    }

    async resolvePdfContextTitle(userId: string | undefined, contextId: string): Promise<string> {
        if (!userId) return ExerciseSetContextType.GROUP;

        const exerciseSetGroup = await this.exerciseSetGroupService.readById(userId, contextId);

        return exerciseSetGroup.title;
    }
}
