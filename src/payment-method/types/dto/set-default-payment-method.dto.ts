import { IsNotEmpty, IsString } from 'class-validator';

export class SetDefaultPaymentMethodDto {
    @IsString()
    @IsNotEmpty()
    readonly paymentMethodId!: string;
}
