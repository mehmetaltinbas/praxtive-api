import { IsOptional, IsString } from 'class-validator';

export class UpdateSourceDto {
    @IsString()
    @IsOptional()
    readonly title?: string;

    @IsString()
    @IsOptional()
    readonly rawText?: string;
}
