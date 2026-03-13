import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ReorderExercisesDto {
    @IsArray()
    @IsNotEmpty()
    readonly orderedExerciseIds!: string[];
}
