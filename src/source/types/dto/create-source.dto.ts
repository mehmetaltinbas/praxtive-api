import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, ValidateIf } from 'class-validator';
import { AUDIO_MAX_DURATION_SECONDS } from 'src/source/constants/audio-max-duration-seconds.constant';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';

export class CreateSourceDto {
    @IsEnum(SourceType)
    @IsNotEmpty()
    readonly type!: SourceType;

    @IsString()
    @IsOptional()
    readonly title?: string;

    @IsEnum(SourceVisibility)
    @IsNotEmpty()
    readonly visibility!: SourceVisibility;

    @IsString()
    @IsNotEmpty()
    @ValidateIf((dto: CreateSourceDto) => dto.type === SourceType.RAW_TEXT)
    readonly rawText?: string;

    // @IsUrl()
    @IsNotEmpty()
    @ValidateIf((dto: CreateSourceDto) => dto.type === SourceType.YOUTUBE_VIDEO)
    readonly url?: string;

    @IsNumber()
    @Max(AUDIO_MAX_DURATION_SECONDS)
    @IsOptional()
    @ValidateIf((dto: CreateSourceDto) => dto.type === SourceType.AUDIO)
    readonly durationSeconds?: number;
}
