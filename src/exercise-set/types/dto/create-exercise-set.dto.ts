import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ExerciseSetType } from 'src/exercise-set/enums/exercise-set-type.enum';

export class CreateExerciseSetDto {
    @IsOptional()
    readonly title?: string;

    @IsNotEmpty()
    readonly count!: number;

    @IsEnum(ExerciseSetType)
    @IsNotEmpty()
    readonly type!: ExerciseSetType;

    @IsNotEmpty()
    readonly difficulty!: string;
}
