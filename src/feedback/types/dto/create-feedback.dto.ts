import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateFeedbackDto {
    @Length(10, 500)
    @IsString()
    @IsNotEmpty()
    readonly content!: string;
}
