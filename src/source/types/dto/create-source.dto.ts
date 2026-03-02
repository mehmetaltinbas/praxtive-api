import { IsEnum, IsNotEmpty } from 'class-validator';
import { SourceType } from 'src/source/enums/source-type.enum';

export class CreateSourceDto {
    @IsEnum(SourceType)
    @IsNotEmpty()
    readonly type!: string;

    @IsNotEmpty()
    readonly title!: string;
}
