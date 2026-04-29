import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MAX_OCCUPATION_LENGTH } from 'src/user/constants/max-occupation-length.constant';
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

    @IsBoolean()
    @IsNotEmpty()
    readonly allowsMarketing!: boolean;

    @MaxLength(MAX_OCCUPATION_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly occupation!: string;
}
