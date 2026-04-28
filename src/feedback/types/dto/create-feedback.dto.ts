import { IsNotEmpty, IsString, Length } from 'class-validator';
import { MAX_FEEDBACK_LENGTH } from 'src/feedback/constants/max-feedback-length.constant';
import { MIN_FEEDBACK_LENGTH } from 'src/feedback/constants/min-feedback-length.constant';

export class CreateFeedbackDto {
    @Length(MIN_FEEDBACK_LENGTH, MAX_FEEDBACK_LENGTH)
    @IsString()
    @IsNotEmpty()
    readonly content!: string;
}
