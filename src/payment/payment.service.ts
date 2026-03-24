import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentStatus } from 'src/payment/enums/payment-status.enum';
import { PaymentDocument } from 'src/payment/types/payment-document.interface';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class PaymentService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Payment', mongoose.Model<PaymentDocument>>
    ) {}

    async createPayment(
        userId: string,
        subscriptionId: string,
        amount: number,
        currency: string,
        provider: PaymentProviderName,
        session?: mongoose.mongo.ClientSession
    ): Promise<PaymentDocument> {
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

        return payment;
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

    async getPaymentsByUser(userId: string): Promise<PaymentDocument[]> {
        return this.db.Payment.find({ user: userId }).sort({ createdAt: -1 });
    }

    async getPaymentsBySubscription(subscriptionId: string): Promise<PaymentDocument[]> {
        return this.db.Payment.find({ subscription: subscriptionId }).sort({ createdAt: -1 });
    }
}
