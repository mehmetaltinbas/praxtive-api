import { IsEnum, IsMongoId, IsNotEmpty, ValidateIf } from 'class-validator';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

export class ChangeExerciseSetContextDto {
    @IsEnum(ExerciseSetContextType)
    @IsNotEmpty()
    readonly contextType!: ExerciseSetContextType;

    @IsMongoId()
    @IsNotEmpty()
    @ValidateIf(
        (o: ExerciseSetDocument) =>
            o.contextType === ExerciseSetContextType.SOURCE || o.contextType === ExerciseSetContextType.GROUP
    )
    readonly contextId?: string;
}
