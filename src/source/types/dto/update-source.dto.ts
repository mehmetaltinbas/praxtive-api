import { IsOptional, IsString } from 'class-validator';

export class UpdateSourceDto {
    @IsString()
    @IsOptional()
    readonly title?: string;
}
