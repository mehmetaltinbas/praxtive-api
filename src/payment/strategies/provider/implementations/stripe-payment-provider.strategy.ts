import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';
import { ChargeParams } from 'src/payment/strategies/provider/types/params/charge.params.';
import { ChargeResult } from 'src/payment/strategies/provider/types/response/charge-result.response';
import { EnsureCustomerResponse } from 'src/payment/strategies/provider/types/response/ensure-customer.response';
import { PaymentMethodDetailsResponse } from 'src/payment/strategies/provider/types/response/payment-method-details.response';
import { RefundResult } from 'src/payment/strategies/provider/types/response/refund-result.response';
import { SetupIntentResultResponse } from 'src/payment/strategies/provider/types/response/setup-intent.response';
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
                customer: params.customerId,
                confirm: true,
                description: params.description,
                metadata: params.metadata,
                off_session: true,
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

    async ensureCustomer(userId: string, email: string): Promise<EnsureCustomerResponse> {
        try {
            const customer = await this.stripe.customers.create({
                email,
                metadata: { userId },
            });

            return { customerId: customer.id };
        } catch (error) {
            this.logger.error('Stripe customer creation failed', error instanceof Error ? error.stack : error);
            throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown Stripe error');
        }
    }

    async createSetupIntent(customerId: string): Promise<SetupIntentResultResponse> {
        try {
            const intent = await this.stripe.setupIntents.create({
                customer: customerId,
                usage: 'off_session',
                payment_method_types: ['card'],
            });

            if (!intent.client_secret) {
                throw new InternalServerErrorException('Stripe returned no client_secret');
            }

            return { clientSecret: intent.client_secret };
        } catch (error) {
            this.logger.error('Stripe setup-intent failed', error instanceof Error ? error.stack : error);
            throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown Stripe error');
        }
    }

    async retrieveMethodDetails(providerRef: string): Promise<PaymentMethodDetailsResponse> {
        try {
            const pm = await this.stripe.paymentMethods.retrieve(providerRef);

            if (!pm.card) {
                throw new InternalServerErrorException('payment method has no card data');
            }

            return {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
                holderName: pm.billing_details?.name ?? null,
            };
        } catch (error) {
            this.logger.error('Stripe payment-method retrieve failed', error instanceof Error ? error.stack : error);
            throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown Stripe error');
        }
    }

    async attachToCustomer(providerRef: string, customerId: string): Promise<void> {
        try {
            const pm = await this.stripe.paymentMethods.retrieve(providerRef);

            if (pm.customer && pm.customer === customerId) {
                return;
            }

            await this.stripe.paymentMethods.attach(providerRef, { customer: customerId });
        } catch (error) {
            this.logger.error('Stripe payment-method attach failed', error instanceof Error ? error.stack : error);
            throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown Stripe error');
        }
    }

    async detach(providerRef: string): Promise<void> {
        try {
            await this.stripe.paymentMethods.detach(providerRef);
        } catch (error) {
            this.logger.error('Stripe payment-method detach failed', error instanceof Error ? error.stack : error);

            // swallow 'resource_missing' — if it's already gone at PSP, we proceed with local delete
            if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
                return;
            }

            throw new InternalServerErrorException(error instanceof Error ? error.message : 'Unknown Stripe error');
        }
    }
}
