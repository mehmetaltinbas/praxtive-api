import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';

export class CloneExerciseSetDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @IsEnum(ExerciseSetVisibility)
    @IsNotEmpty()
    readonly visibility!: ExerciseSetVisibility;
}
