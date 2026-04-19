import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export class CreatePlanDto {
    @IsNotEmpty()
    readonly name!: PlanName;

    @IsNotEmpty()
    readonly monthlyPrice!: number;

    @IsNotEmpty()
    @IsString()
    readonly currency!: string;

    @IsNotEmpty()
    readonly monthlyCredits!: number;

    @IsNotEmpty()
    readonly maximumCredits!: number;

    @IsNotEmpty()
    readonly maxSources!: number;

    @IsNotEmpty()
    readonly maxExerciseSets!: number;
}
