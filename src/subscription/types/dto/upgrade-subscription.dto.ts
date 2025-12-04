import { IsNotEmpty } from 'class-validator';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export class UpgradeSubscriptionDto {
    @IsNotEmpty()
    readonly newPlanName!: PlanName;
}
