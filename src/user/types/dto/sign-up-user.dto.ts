import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class SignUpUserDto {
    @Matches(/^\S+$/, { message: 'userName must not contain spaces' })
    @IsString()
    @IsNotEmpty()
    readonly userName!: string;

    @IsEmail()
    @IsNotEmpty()
    readonly email!: string;

    @IsNotEmpty()
    readonly password!: string;
}
