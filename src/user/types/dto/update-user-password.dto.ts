import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserPasswordDto {
    @IsString()
    @IsNotEmpty()
    readonly oldPassword!: string;

    @IsString()
    @IsNotEmpty()
    readonly newPassword!: string;
}
