import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MCQ_CHOICES_COUNT } from 'src/exercise/constants/mcq-choices-count.constant';
import { ExerciseDifficulty } from 'src/exercise/enums/exercise-difficulty.enum';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export class CreateExerciseDto {
    @IsEnum(ExerciseType)
    @IsNotEmpty()
    readonly type!: ExerciseType;

    @IsEnum(ExerciseDifficulty)
    @IsNotEmpty()
    readonly difficulty!: ExerciseDifficulty;

    @IsString()
    @IsNotEmpty()
    readonly prompt!: string;

    @IsString()
    @IsOptional()
    solution?: string;

    @IsString({ each: true })
    @IsArray()
    @IsOptional()
    choices?: string[];

    @Max(MCQ_CHOICES_COUNT - 1)
    @Min(0)
    @IsInt()
    @IsOptional()
    correctChoiceIndex?: number;
}
