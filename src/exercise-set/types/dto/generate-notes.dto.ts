import { IsEnum, IsNotEmpty } from 'class-validator';
import { GenerateNotesFocus } from 'src/exercise-set/enums/generate-notes-focus.enum';

export class GenerateNotesDto {
    @IsEnum(GenerateNotesFocus)
    @IsNotEmpty()
    readonly focus!: GenerateNotesFocus;
}
