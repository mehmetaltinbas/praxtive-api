import { IsNotEmpty } from 'class-validator';

export class EstimateEvaluatePaperAnswersDto {
    @IsNotEmpty()
    readonly imageCount!: number;
}
