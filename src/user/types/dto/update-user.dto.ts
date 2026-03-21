import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { MIN_USER_NAME_LENGTH } from 'src/user/constants/min-user-name-length.constant';

export class UpdateUserDto {
    @MinLength(MIN_USER_NAME_LENGTH)
    @Matches(/^\S+$/, { message: 'userName must not contain spaces' })
    @IsString()
    @IsOptional()
    readonly userName?: string;

    @IsEmail()
    @IsOptional()
    readonly email!: string;
}
