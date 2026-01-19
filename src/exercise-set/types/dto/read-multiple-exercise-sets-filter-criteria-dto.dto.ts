import { IsEnum, IsOptional } from 'class-validator';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';

export class ReadMultipleExerciseSetsFilterCriteriaDto {
    @IsOptional()
    @IsEnum(ExerciseSetSourceType)
    readonly sourceType?: ExerciseSetSourceType;
}
