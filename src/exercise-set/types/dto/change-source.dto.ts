import { IsEnum, IsMongoId, IsNotEmpty, ValidateIf } from 'class-validator';
import { ExerciseSetSourceType } from 'src/exercise-set/enums/exercise-set-source-type.enum';
import { ExerciseSetDocument } from 'src/exercise-set/types/exercise-set-document.interface';

export class ChangeSourceDto {
    @IsEnum(ExerciseSetSourceType)
    @IsNotEmpty()
    readonly sourceType!: ExerciseSetSourceType;

    @IsMongoId()
    @IsNotEmpty()
    @ValidateIf((o: ExerciseSetDocument) => o.sourceType === ExerciseSetSourceType.SOURCE)
    readonly sourceId?: string;
}
