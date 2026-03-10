import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { SourceType } from 'src/source/enums/source-type.enum';

export class CreateSourceDto {
    @IsEnum(SourceType)
    @IsNotEmpty()
    readonly type!: SourceType;

    @IsOptional()
    @IsString()
    readonly title?: string;

    @ValidateIf((o) => o.type === SourceType.RAW_TEXT)
    @IsString()
    @IsNotEmpty()
    readonly rawText?: string;

    @ValidateIf((o) => o.type === SourceType.YOUTUBE_VIDEO)
    @IsUrl()
    @IsNotEmpty()
    readonly url?: string;
}
