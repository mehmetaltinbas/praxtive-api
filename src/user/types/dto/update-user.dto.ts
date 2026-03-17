import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto {
    @Matches(/^\S+$/, { message: 'userName must not contain spaces' })
    @IsString()
    @IsOptional()
    readonly userName?: string;

    @IsEmail()
    @IsOptional()
    readonly email!: string;
}
