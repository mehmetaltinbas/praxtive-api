import { IsEmail, IsInt, IsNotEmpty, IsString, Max, Min, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from 'src/user/constants/min-password-length.constant';

export class ResetPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email!: string;

    @Min(100000)
    @Max(999999)
    @IsInt()
    @IsNotEmpty()
    readonly code!: number;

    @MinLength(MIN_PASSWORD_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly newPassword!: string;
}
