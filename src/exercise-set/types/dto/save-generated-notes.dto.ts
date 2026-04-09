import { IsNotEmpty, IsString } from 'class-validator';

export class SaveGeneratedNotesDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @IsString()
    @IsNotEmpty()
    readonly rawText!: string;
}
