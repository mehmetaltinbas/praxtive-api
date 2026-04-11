import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email!: string;

    @Length(6, 6)
    @IsString()
    @IsNotEmpty()
    readonly code!: string;
}
