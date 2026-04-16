import { IsEnum, IsInt, IsNotEmpty, IsString, Length, ValidateIf } from 'class-validator';
import { MAX_GENERATE_EXERCISES_COUNT } from 'src/exercise-set/constants/max-generate-exercises-count.constant';
import { MIN_GENERATE_EXERCISES_COUNT } from 'src/exercise-set/constants/min-generate-exercises-count.constant';
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

    @Length(MIN_GENERATE_EXERCISES_COUNT, MAX_GENERATE_EXERCISES_COUNT)
    @IsInt()
    @IsNotEmpty()
    @ValidateIf((dto: CreateExerciseSetDto) => dto.contextType === ExerciseSetContextType.SOURCE)
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
