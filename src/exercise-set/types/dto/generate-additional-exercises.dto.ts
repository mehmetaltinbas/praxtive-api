import { IsEnum, IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { MAX_GENERATE_EXERCISES_COUNT } from 'src/exercise-set/constants/max-generate-exercises-count.constant';
import { MIN_GENERATE_EXERCISES_COUNT } from 'src/exercise-set/constants/min-generate-exercises-count.constant';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export class GenerateAdditionalExercisesDto {
    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsEnum(ExerciseSetDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseSetDifficulty;

    @Max(MAX_GENERATE_EXERCISES_COUNT)
    @Min(MIN_GENERATE_EXERCISES_COUNT)
    @IsInt()
    @IsNotEmpty()
    readonly count!: number;
}
