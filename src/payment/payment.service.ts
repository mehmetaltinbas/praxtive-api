import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentStatus } from 'src/payment/enums/payment-status.enum';
import { PaymentProviderStrategy } from 'src/payment/strategies/provider/payment-provider-strategy.interface';
import { PaymentProviderFactory } from 'src/payment/strategies/provider/payment-provider.factory';
import { CalculateProrationResponse } from 'src/payment/strategies/provider/types/response/calculate-proration.response';
import { PaymentDocument } from 'src/payment/types/payment-document.interface';
import { CreatePaymentResponse } from 'src/payment/types/response/create-payment.response';
import { ReadMultiplePaymentsResponse } from 'src/payment/types/response/read-multiple-payments.response';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class PaymentService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Payment', mongoose.Model<PaymentDocument>>,
        private paymentProviderFactory: PaymentProviderFactory
    ) {}

    resolvePaymentProviderStrategy(type: PaymentProviderName): PaymentProviderStrategy {
        return this.paymentProviderFactory.resolveStrategy(type);
    }

    async create(
        userId: string,
        subscriptionId: string,
        amount: number,
        currency: string,
        provider: PaymentProviderName,
        session?: mongoose.mongo.ClientSession
    ): Promise<CreatePaymentResponse> {
        const [payment] = await this.db.Payment.create(
            [
                {
                    user: userId,
                    subscription: subscriptionId,
                    amount,
                    currency,
                    provider,
                    status: PaymentStatus.PENDING,
                },
            ],
            { session }
        );

        if (!payment) {
            throw new InternalServerErrorException("payment couldn't be created");
        }

        return {
            isSuccess: true,
            message: 'Payment created.',
            createdPayment: payment,
        };
    }

    async markSucceeded(
        paymentId: string,
        providerTransactionId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const payment = await this.db.Payment.findByIdAndUpdate(
            paymentId,
            {
                status: PaymentStatus.SUCCEEDED,
                providerTransactionId,
            },
            { session, new: true }
        );

        if (!payment) {
            throw new NotFoundException('payment not found');
        }

        return { isSuccess: true, message: 'payment marked as succeeded' };
    }

    async markFailed(
        paymentId: string,
        failureReason: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const payment = await this.db.Payment.findByIdAndUpdate(
            paymentId,
            {
                status: PaymentStatus.FAILED,
                failureReason,
            },
            { session, new: true }
        );

        if (!payment) {
            throw new NotFoundException('payment not found');
        }

        return { isSuccess: true, message: 'payment marked as failed' };
    }

    async getPaymentsByUser(userId: string): Promise<ReadMultiplePaymentsResponse> {
        const payments = await this.db.Payment.find({ user: userId }).sort({ createdAt: -1 });

        return {
            isSuccess: true,
            message: 'Payments that are associated with given user.',
            payments,
        };
    }

    async getPaymentsBySubscription(subscriptionId: string): Promise<ReadMultiplePaymentsResponse> {
        const payments = await this.db.Payment.find({ subscription: subscriptionId }).sort({ createdAt: -1 });

        return {
            isSuccess: true,
            message: 'Payments that are associated with given subscription.',
            payments,
        };
    }

    calculateProrationOnUpgrade(
        nextBillingDate: Date,
        currentPlanMonthlyPrice: number,
        newPlanMonthlyPrice: number
    ): CalculateProrationResponse {
        const diffMs = nextBillingDate.getTime() - new Date().getTime();
        const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const extractedPrice = currentPlanMonthlyPrice * (remainingDays / 30);
        const priceToPay = Number((newPlanMonthlyPrice - extractedPrice).toFixed(2));

        return {
            isSuccess: true,
            message: 'prorationed price calculated',
            prorationedPriceToPay: priceToPay,
            extractedPrice,
            remainingDays,
        };
    }
}
