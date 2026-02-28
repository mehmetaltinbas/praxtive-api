import { IsEnum, IsOptional } from 'class-validator';
import { ExerciseSetDifficulty } from 'src/exercise-set/enums/exercise-set-difficulty.enum';

export class UpdateExerciseSetDto {
    @IsOptional()
    readonly type?: string;

    @IsEnum(ExerciseSetDifficulty)
    @IsOptional()
    readonly difficulty?: ExerciseSetDifficulty;

    @IsOptional()
    readonly count?: number;

    @IsOptional()
    readonly title?: string;
}
