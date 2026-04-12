import { IsEmail, IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class VerifyEmailDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email!: string;

    @Min(100000)
    @Max(999999)
    @IsInt()
    @IsNotEmpty()
    readonly code!: number;
}
