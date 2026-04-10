import { IsOptional, IsString } from 'class-validator';

export class UpdateExerciseSetGroupDto {
    @IsString()
    @IsOptional()
    readonly title?: string;
}
