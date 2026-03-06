import { IsEnum, IsOptional } from 'class-validator';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export class UpdateExerciseDto {
    @IsEnum(ExerciseType)
    @IsOptional()
    type?: ExerciseType;

    @IsEnum(ExerciseDifficulty)
    @IsOptional()
    difficulty?: ExerciseDifficulty;

    @IsOptional()
    prompt?: string;

    @IsOptional()
    solution?: string;

    @IsOptional()
    choices?: string[];

    @IsOptional()
    correctChoiceIndex?: number;
}
