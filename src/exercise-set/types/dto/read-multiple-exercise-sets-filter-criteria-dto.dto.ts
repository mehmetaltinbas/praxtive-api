import { IsEnum, IsOptional } from 'class-validator';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';

export class ReadMultipleExerciseSetsFilterCriteriaDto {
    @IsOptional()
    @IsEnum(ExerciseSetContextType)
    readonly contextType?: ExerciseSetContextType;
}
