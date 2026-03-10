import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { SourceType } from 'src/source/enums/source-type.enum';

export class CreateSourceDto {
    @IsEnum(SourceType)
    @IsNotEmpty()
    readonly type!: SourceType;

    @IsString()
    @IsOptional()
    readonly title?: string;

    @IsString()
    @IsNotEmpty()
    @ValidateIf((dto: CreateSourceDto) => dto.type === SourceType.RAW_TEXT)
    readonly rawText?: string;

    // @IsUrl()
    @IsNotEmpty()
    @ValidateIf((dto: CreateSourceDto) => dto.type === SourceType.YOUTUBE_VIDEO)
    readonly url?: string;
}
