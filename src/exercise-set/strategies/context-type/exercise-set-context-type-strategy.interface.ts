import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';

export interface CreateContextResult {
    contextType: ExerciseSetContextType;
    contextId?: string;
    sourceText?: string;
}

export interface AdditionalExercisesContextResult {
    sourceText: string;
}

export interface ChangeContextResult {
    contextId?: string;
}

export interface ExerciseSetContextTypeStrategy {
    readonly type: ExerciseSetContextType;

    resolveCreateContext(userId: string, contextReferenceId?: string): Promise<CreateContextResult>;

    resolveAdditionalExercisesContext(userId: string, contextId: string): Promise<AdditionalExercisesContextResult>;

    resolveChangeContext(userId: string, contextId?: string): Promise<ChangeContextResult>;

    resolvePdfContextTitle(userId: string | undefined, contextId: string): Promise<string>;
}
