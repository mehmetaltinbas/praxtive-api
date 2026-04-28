import { IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';
import { MAX_SOURCE_LENGTH } from 'src/source/constants/max-source-length.constant';
import { MIN_SOURCE_LENGTH } from 'src/source/constants/min-source-length.constant';

export class SaveGeneratedNotesDto {
    @Length(MIN_SOURCE_LENGTH, MAX_SOURCE_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @IsString()
    @IsNotEmpty()
    readonly rawText!: string;

    @IsBoolean()
    @IsNotEmpty()
    readonly link!: boolean;
}
