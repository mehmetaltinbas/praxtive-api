import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';

export class UpdateSourceDto {
    @IsString()
    @IsOptional()
    readonly title?: string;

    @IsString()
    @IsOptional()
    readonly rawText?: string;

    @IsEnum(SourceVisibility)
    @IsOptional()
    readonly visibility?: SourceVisibility;
}
