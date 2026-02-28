import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export class CreateExerciseDto {
    @IsEnum(ExerciseType)
    @IsNotEmpty()
    readonly type!: ExerciseType;

    @IsEnum(ExerciseDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseDifficulty;

    @IsNotEmpty()
    readonly prompt!: string;

    @IsOptional()
    solution?: string;

    @IsOptional()
    choices?: string[];

    @IsOptional()
    correctChoiceIndex?: number;
}
