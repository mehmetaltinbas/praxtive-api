import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSignInDto {
    @IsString()
    @IsNotEmpty()
    readonly credential!: string;
}
