import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from 'src/user/constants/min-password-length.constant';

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    readonly userName!: string;

    @MinLength(MIN_PASSWORD_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly password!: string;
}
