import { IsOptional } from 'class-validator';

export class UpdateExerciseSetDto {
    @IsOptional()
    readonly title?: string;
}
