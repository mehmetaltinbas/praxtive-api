import { IsNotEmpty, IsString } from 'class-validator';

export class TransferExerciseDto {
    @IsString()
    @IsNotEmpty()
    readonly exerciseSetId!: string;
}
