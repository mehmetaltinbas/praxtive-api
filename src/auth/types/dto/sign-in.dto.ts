import { IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    readonly userName!: string;

    @IsString()
    @IsNotEmpty()
    readonly password!: string;
}
