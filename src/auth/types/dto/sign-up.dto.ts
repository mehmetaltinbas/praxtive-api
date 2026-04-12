import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from 'src/user/constants/min-password-length.constant';
import { MIN_USER_NAME_LENGTH } from 'src/user/constants/min-user-name-length.constant';

export class SignUpDto {
    @MinLength(MIN_USER_NAME_LENGTH)
    @Matches(/^\S+$/, { message: 'userName must not contain spaces' })
    @IsString()
    @IsNotEmpty()
    readonly userName!: string;

    @IsEmail()
    @IsNotEmpty()
    readonly email!: string;

    @MinLength(MIN_PASSWORD_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly password!: string;
}
