import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SourceVisibility } from 'src/source/enums/source-visibility.enum';

export class CloneSourceDto {
    @IsString()
    @IsNotEmpty()
    readonly title!: string;

    @IsEnum(SourceVisibility)
    @IsNotEmpty()
    readonly visibility!: SourceVisibility;
}
