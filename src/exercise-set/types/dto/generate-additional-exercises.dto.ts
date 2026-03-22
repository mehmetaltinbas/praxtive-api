import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export class GenerateAdditionalExercisesDto {
    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsEnum(ExerciseSetDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseSetDifficulty;

    @IsInt()
    @IsNotEmpty()
    @Min(1)
    readonly count!: number;
}
