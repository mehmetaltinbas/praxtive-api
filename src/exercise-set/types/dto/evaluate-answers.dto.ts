import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class Exercise {
    @IsString()
    @IsNotEmpty()
    readonly id!: string;

    @IsString()
    @IsNotEmpty()
    readonly answer!: string;
}

export class EvaluateAnswersDto {
    @IsNotEmpty()
    readonly exercises!: Exercise[];
}
