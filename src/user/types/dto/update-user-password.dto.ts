import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from 'src/user/constants/min-password-length.constant';

export class UpdateUserPasswordDto {
    @MinLength(MIN_PASSWORD_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly oldPassword!: string;

    @MinLength(MIN_PASSWORD_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly newPassword!: string;
}
