import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export class GenerateExerciseWithContextDto {
    @IsString()
    @IsNotEmpty()
    readonly context!: string;

    @IsEnum(ExerciseType)
    @IsNotEmpty()
    readonly type!: ExerciseType;

    @IsEnum(ExerciseDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseDifficulty;
}
