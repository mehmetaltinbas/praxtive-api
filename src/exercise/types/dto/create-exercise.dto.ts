import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ExerciseType } from 'src/exercise/enums/exercise-type.enum';

export class CreateExerciseDto {
    @IsEnum(ExerciseType)
    @IsNotEmpty()
    readonly type!: ExerciseType;

    @IsNotEmpty()
    readonly difficulty!: string;

    @IsNotEmpty()
    readonly prompt!: string;

    @IsOptional()
    solution?: string;

    @IsOptional()
    choices?: string[];

    @IsOptional()
    correctChoiceIndex?: number;
}
