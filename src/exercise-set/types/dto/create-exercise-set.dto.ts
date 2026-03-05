import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export class CreateExerciseSetDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @IsInt()
    @IsNotEmpty()
    readonly count!: number;

    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsEnum(ExerciseSetDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseSetDifficulty;
}
