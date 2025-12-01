import { IsNotEmpty } from 'class-validator';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export class CreatePlanDto {
    @IsNotEmpty()
    readonly name!: PlanName;

    @IsNotEmpty()
    readonly monthlyPrice!: number;

    @IsNotEmpty()
    readonly monthlyCredits!: number;

    @IsNotEmpty()
    readonly maximumCredits!: number;
}
