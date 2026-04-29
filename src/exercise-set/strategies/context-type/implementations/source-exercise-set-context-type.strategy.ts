import { Injectable } from '@nestjs/common';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import {
    AdditionalExercisesContextResult,
    ChangeContextResult,
    CreateContextResult,
    ExerciseSetContextTypeStrategy,
} from 'src/exercise-set/strategies/context-type/exercise-set-context-type-strategy.interface';
import { SourceService } from 'src/source/source.service';

@Injectable()
export class SourceExerciseSetContextTypeStrategy implements ExerciseSetContextTypeStrategy {
    readonly type = ExerciseSetContextType.SOURCE;

    constructor(private sourceService: SourceService) {}

    async resolveCreateContext(userId: string, contextReferenceId?: string): Promise<CreateContextResult> {
        const { source } = await this.sourceService.readById(userId, contextReferenceId!);

        return {
            contextType: ExerciseSetContextType.SOURCE,
            contextId: contextReferenceId,
            sourceText: source.rawText,
        };
    }

    async resolveAdditionalExercisesContext(
        userId: string,
        contextId: string
    ): Promise<AdditionalExercisesContextResult> {
        const { source } = await this.sourceService.readById(userId, contextId);

        return { sourceText: source.rawText };
    }

    async resolveChangeContext(userId: string, contextId?: string): Promise<ChangeContextResult> {
        await this.sourceService.readById(userId, contextId!);

        return { contextId };
    }

    async resolvePdfContextTitle(userId: string | undefined, contextId: string): Promise<string> {
        if (!userId) return ExerciseSetContextType.SOURCE;

        const { source } = await this.sourceService.readById(userId, contextId);

        return source.title;
    }
}
