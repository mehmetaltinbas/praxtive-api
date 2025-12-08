import { IsNotEmpty, IsOptional } from 'class-validator';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';

export class CreateSubscriptionDto {
    @IsNotEmpty()
    readonly planName!: PlanName;

    @IsNotEmpty()
    readonly nextBillingDate!: Date;

    @IsNotEmpty()
    readonly status!: SubscriptionStatus;

    @IsOptional()
    readonly startedAt?: Date;

    @IsOptional()
    readonly canceledAt?: Date;

    @IsOptional()
    readonly endedAt?: Date;
}
