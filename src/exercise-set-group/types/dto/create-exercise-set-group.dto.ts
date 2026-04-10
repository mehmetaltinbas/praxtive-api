import { IsNotEmpty, IsString } from 'class-validator';

export class CreateExerciseSetGroupDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;
}
