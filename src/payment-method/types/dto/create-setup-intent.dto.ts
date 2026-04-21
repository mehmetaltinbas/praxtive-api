import { IsEnum, IsOptional } from 'class-validator';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';

export class CreateSetupIntentDto {
    @IsOptional()
    @IsEnum(PaymentProviderName)
    readonly provider?: PaymentProviderName;
}
