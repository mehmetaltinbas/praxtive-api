import { IsEnum, IsOptional } from 'class-validator';
import { SourceType } from 'src/source/enums/source-type.enum';

export class UpdateSourceDto {
    @IsOptional()
    @IsEnum(SourceType)
    readonly type?: SourceType;

    @IsOptional()
    readonly title?: string;
}
