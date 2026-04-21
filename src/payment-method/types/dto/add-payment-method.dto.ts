import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';

export class AddPaymentMethodDto {
    @IsEnum(PaymentProviderName)
    readonly provider!: PaymentProviderName;

    @IsString()
    @IsNotEmpty()
    readonly token!: string;
}
