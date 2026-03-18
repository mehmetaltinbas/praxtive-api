import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';

export class UpdateExerciseSetDto {
    @IsString()
    @IsOptional()
    readonly title?: string;

    @IsEnum(ExerciseSetVisibility)
    @IsOptional()
    readonly visibility?: ExerciseSetVisibility;
}
