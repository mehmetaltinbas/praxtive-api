import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';

export class CreateExerciseSetDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @Min(1)
    @IsInt()
    @IsNotEmpty()
    readonly count!: number;

    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsEnum(ExerciseSetDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseSetDifficulty;

    @IsEnum(ExerciseSetVisibility)
    @IsNotEmpty()
    readonly visibility!: ExerciseSetVisibility;
}
