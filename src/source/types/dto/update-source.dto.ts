import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSourceDto {
    @IsOptional()
    readonly type!: string;

    @IsOptional()
    readonly title!: string;
}
