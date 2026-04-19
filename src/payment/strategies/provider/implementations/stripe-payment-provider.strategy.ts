import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';
import { ChargeParams } from 'src/payment/strategies/provider/types/params/charge.params.';
import { ChargeResult } from 'src/payment/strategies/provider/types/response/charge-result.response';
import { RefundResult } from 'src/payment/strategies/provider/types/response/refund-result.response';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentProviderStrategy implements PaymentProviderStrategy {
    readonly type = PaymentProviderName.STRIPE;
    private readonly logger = new Logger(StripePaymentProviderStrategy.name);
    private readonly stripe: Stripe;

    constructor(private readonly configService: ConfigService) {
        this.stripe = new Stripe(this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'));
    }

    async charge(params: ChargeParams): Promise<ChargeResult> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(params.amount * 100),
                currency: params.currency.toLowerCase(),
                payment_method: params.paymentMethodToken,
                confirm: true,
                description: params.description,
                metadata: params.metadata,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never',
                },
            });

            if (paymentIntent.status === 'succeeded') {
                return {
                    success: true,
                    providerTransactionId: paymentIntent.id,
                };
            }

            return {
                success: false,
                providerTransactionId: paymentIntent.id,
                failureReason: `Payment intent status: ${paymentIntent.status}`,
            };
        } catch (error) {
            this.logger.error('Stripe charge failed', error instanceof Error ? error.stack : error);

            return {
                success: false,
                failureReason: error instanceof Error ? error.message : 'Unknown Stripe error',
            };
        }
    }

    async refund(providerTransactionId: string, amount: number, _currency: string): Promise<RefundResult> {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: providerTransactionId,
                amount: Math.round(amount * 100),
            });

            return {
                success: refund.status === 'succeeded',
                providerRefundId: refund.id,
                failureReason: refund.status !== 'succeeded' ? `Refund status: ${refund.status}` : undefined,
            };
        } catch (error) {
            this.logger.error('Stripe refund failed', error instanceof Error ? error.stack : error);

            return {
                success: false,
                failureReason: error instanceof Error ? error.message : 'Unknown Stripe error',
            };
        }
    }
}
