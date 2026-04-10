import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ExerciseSetContextType } from 'src/exercise-set/enums/exercise-set-context-type.enum';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';
import { ExerciseSetVisibility } from 'src/exercise-set/enums/exercise-set-visibility.enum';

export class CreateExerciseSetDto {
    @IsEnum(ExerciseSetContextType)
    @IsNotEmpty()
    readonly contextType!: ExerciseSetContextType;

    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @Min(0)
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
