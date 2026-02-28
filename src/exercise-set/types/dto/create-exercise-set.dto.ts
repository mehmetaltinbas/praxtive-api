import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export class CreateExerciseSetDto {
    @IsOptional()
    readonly title?: string;

    @IsNotEmpty()
    readonly count!: number;

    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsEnum(ExerciseSetDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseSetDifficulty;
}
