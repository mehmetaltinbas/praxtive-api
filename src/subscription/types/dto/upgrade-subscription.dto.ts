import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PlanName } from 'src/plan/enums/plan-name.enum';

export class UpgradeSubscriptionDto {
    @IsNotEmpty()
    readonly newPlanName!: PlanName;

    @IsOptional()
    @IsEnum(PaymentProviderName)
    readonly paymentProvider?: PaymentProviderName;

    @IsOptional()
    @IsString()
    readonly paymentMethodToken?: string;
}
