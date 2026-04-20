import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Iyzipay from 'iyzipay';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';
import { ChargeParams } from 'src/payment/strategies/provider/types/params/charge.params.';
import { ChargeResult } from 'src/payment/strategies/provider/types/response/charge-result.response';
import { RefundResult } from 'src/payment/strategies/provider/types/response/refund-result.response';

@Injectable()
export class IyzicoPaymentProviderStrategy implements PaymentProviderStrategy {
    readonly type = PaymentProviderName.IYZICO;
    private readonly logger = new Logger(IyzicoPaymentProviderStrategy.name);
    private readonly iyzipay: Iyzipay;

    constructor(private readonly configService: ConfigService) {
        this.iyzipay = new Iyzipay({
            apiKey: this.configService.getOrThrow<string>('IYZICO_API_KEY'),
            secretKey: this.configService.getOrThrow<string>('IYZICO_SECRET_KEY'),
            uri: this.configService.getOrThrow<string>('IYZICO_BASE_URL'),
        });
    }

    async charge(params: ChargeParams): Promise<ChargeResult> {
        try {
            const result = await new Promise<any>((resolve, reject) => {
                this.iyzipay.payment.create(
                    {
                        locale: Iyzipay.LOCALE.TR,
                        conversationId: params.metadata?.conversationId || String(Date.now()),
                        price: String(params.amount),
                        paidPrice: String(params.amount),
                        currency: params.currency as any,
                        installments: 1,
                        paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
                        paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
                        paymentCard: {
                            cardToken: params.paymentMethodToken,
                            cardUserKey: params.metadata?.cardUserKey || '',
                        } as any,
                        buyer: {
                            id: params.metadata?.userId || 'UNKNOWN',
                            name: params.metadata?.userName || 'UNKNOWN',
                            surname: params.metadata?.userName || 'UNKNOWN',
                            email: params.metadata?.userEmail || 'unknown@example.com',
                            identityNumber: '00000000000',
                            registrationAddress: 'N/A',
                            city: 'Istanbul',
                            country: 'Turkey',
                            ip: params.metadata?.ip || '0.0.0.0',
                        },
                        shippingAddress: {
                            contactName: params.metadata?.userName || 'UNKNOWN',
                            city: 'Istanbul',
                            country: 'Turkey',
                            address: 'N/A',
                        },
                        billingAddress: {
                            contactName: params.metadata?.userName || 'UNKNOWN',
                            city: 'Istanbul',
                            country: 'Turkey',
                            address: 'N/A',
                        },
                        basketItems: [
                            {
                                id: params.metadata?.planId || 'PLAN',
                                name: params.description || 'Subscription',
                                category1: 'Subscription',
                                itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
                                price: String(params.amount),
                            },
                        ],
                    },
                    (err: any, result: any) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });

            if (result.status === 'success') {
                return {
                    success: true,
                    providerTransactionId: result.paymentId,
                };
            }

            return {
                success: false,
                failureReason: result.errorMessage || 'Iyzico payment failed',
            };
        } catch (error) {
            this.logger.error('Iyzico charge failed', error instanceof Error ? error.stack : error);

            return {
                success: false,
                failureReason: error instanceof Error ? error.message : 'Unknown Iyzico error',
            };
        }
    }

    async refund(providerTransactionId: string, amount: number, currency: string): Promise<RefundResult> {
        try {
            const result = await new Promise<any>((resolve, reject) => {
                this.iyzipay.refund.create(
                    {
                        locale: Iyzipay.LOCALE.TR,
                        conversationId: String(Date.now()),
                        paymentTransactionId: providerTransactionId,
                        price: String(amount),
                        currency: currency as any,
                        ip: '0.0.0.0',
                    },
                    (err: any, result: any) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
            });

            if (result.status === 'success') {
                return {
                    success: true,
                    providerRefundId: result.paymentTransactionId,
                };
            }

            return {
                success: false,
                failureReason: result.errorMessage || 'Iyzico refund failed',
            };
        } catch (error) {
            this.logger.error('Iyzico refund failed', error instanceof Error ? error.stack : error);

            return {
                success: false,
                failureReason: error instanceof Error ? error.message : 'Unknown Iyzico error',
            };
        }
    }
}
