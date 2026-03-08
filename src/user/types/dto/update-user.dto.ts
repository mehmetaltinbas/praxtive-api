import { IsOptional } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    readonly userName?: string;

    @IsOptional()
    readonly password?: string;
}
