import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { AddPaymentMethodDto } from 'src/payment-method/types/dto/add-payment-method.dto';
import { CreateSetupIntentDto } from 'src/payment-method/types/dto/create-setup-intent.dto';
import { SetDefaultPaymentMethodDto } from 'src/payment-method/types/dto/set-default-payment-method.dto';
import { PaymentMethodDocument } from 'src/payment-method/types/payment-method-document.interface';
import { AddPaymentMethodResponse } from 'src/payment-method/types/response/add-payment-method.response';
import { CreateSetupIntentResponse } from 'src/payment-method/types/response/create-setup-intent.response';
import { DeletePaymentMethodResponse } from 'src/payment-method/types/response/delete-payment-method.response';
import { ReadAllPaymentMethodsResponse } from 'src/payment-method/types/response/read-all-payment-methods.response';
import { SetDefaultPaymentMethodResponse } from 'src/payment-method/types/response/set-default-payment-method.response';
import { PaymentProviderName } from 'src/payment/enums/payment-provider-name.enum';
import { PaymentService } from 'src/payment/payment.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PaymentMethodService {
    private readonly logger = new Logger(PaymentMethodService.name);

    constructor(
        @Inject('DB_MODELS') private db: { PaymentMethod: mongoose.Model<PaymentMethodDocument> },
        private paymentService: PaymentService,
        private userService: UserService,
        @Inject(forwardRef(() => SubscriptionService)) private subscriptionService: SubscriptionService
    ) {}

    async readAll(userId: string): Promise<ReadAllPaymentMethodsResponse> {
        const docs = await this.db.PaymentMethod.find({ user: userId }).sort({ isDefault: -1, createdAt: 1 }).exec();

        return {
            isSuccess: true,
            message: 'payment methods read',
            paymentMethods: docs,
        };
    }

    async createSetupIntent(userId: string, dto: CreateSetupIntentDto): Promise<CreateSetupIntentResponse> {
        const provider = dto.provider ?? PaymentProviderName.STRIPE;
        const strategy = this.paymentService.resolvePaymentProviderStrategy(provider);

        const customerId = await this.ensureCustomerId(userId, provider);

        const { clientSecret } = await strategy.createSetupIntent(customerId);

        return { isSuccess: true, message: 'setup intent created', clientSecret };
    }

    async add(userId: string, dto: AddPaymentMethodDto): Promise<AddPaymentMethodResponse> {
        const strategy = this.paymentService.resolvePaymentProviderStrategy(dto.provider);

        const customerId = await this.ensureCustomerId(userId, dto.provider);

        await strategy.attachToCustomer(dto.token, customerId);
        const details = await strategy.retrieveMethodDetails(dto.token);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const existingCount = await this.db.PaymentMethod.countDocuments({
                user: userId,
            }).session(session);

            const existingSameRef = await this.db.PaymentMethod.findOne({
                provider: dto.provider,
                providerRef: dto.token,
            }).session(session);

            let doc: PaymentMethodDocument;

            if (existingSameRef) {
                doc = existingSameRef;
            } else {
                const [created] = await this.db.PaymentMethod.create(
                    [
                        {
                            user: userId,
                            provider: dto.provider,
                            providerRef: dto.token,
                            brand: details.brand,
                            last4: details.last4,
                            expMonth: details.expMonth,
                            expYear: details.expYear,
                            holderName: details.holderName ?? null,
                            isDefault: existingCount === 0,
                        },
                    ],
                    { session }
                );

                if (!created) {
                    throw new HttpException(
                        {
                            message: 'failed to persist payment method',
                        },
                        HttpStatus.INTERNAL_SERVER_ERROR
                    );
                }

                doc = created;
            }

            await session.commitTransaction();

            return {
                isSuccess: true,
                message: 'payment method added',
                paymentMethod: doc,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async setDefault(userId: string, dto: SetDefaultPaymentMethodDto): Promise<SetDefaultPaymentMethodResponse> {
        const target = await this.db.PaymentMethod.findOne({
            _id: dto.paymentMethodId,
            user: userId,
        });

        if (!target) {
            throw this.notFound();
        }

        if (!target.isDefault) {
            const session = await mongoose.startSession();

            session.startTransaction();

            try {
                await this.db.PaymentMethod.updateMany(
                    { user: userId, _id: { $ne: target._id }, isDefault: true },
                    { $set: { isDefault: false } },
                    { session }
                );
                await this.db.PaymentMethod.updateOne({ _id: target._id }, { $set: { isDefault: true } }, { session });

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }
        }

        const refreshed = await this.readAll(userId);

        return {
            isSuccess: true,
            message: 'default payment method set',
            paymentMethods: refreshed.paymentMethods,
        };
    }

    async delete(userId: string, paymentMethodId: string): Promise<DeletePaymentMethodResponse> {
        const target = await this.db.PaymentMethod.findOne({
            _id: paymentMethodId,
            user: userId,
        });

        if (!target) {
            throw this.notFound();
        }

        const remainingCount = await this.db.PaymentMethod.countDocuments({ user: userId });

        if (remainingCount <= 1 && (await this.subscriptionService.hasActivePaidSubscription(userId))) {
            throw new HttpException(
                'cannot delete your only payment method while an active paid subscription exists',
                HttpStatus.CONFLICT
            );
        }

        const strategy = this.paymentService.resolvePaymentProviderStrategy(target.provider);

        try {
            await strategy.detach(target.providerRef);
        } catch (error) {
            this.logger.warn(
                `detach failed for pm ${target._id}: ${error instanceof Error ? error.message : 'unknown'}`
            );
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const wasDefault = target.isDefault;

            await this.db.PaymentMethod.deleteOne({ _id: target._id }, { session });

            if (wasDefault) {
                const successor = await this.db.PaymentMethod.findOne({ user: userId })
                    .sort({ createdAt: 1 })
                    .session(session);

                if (successor) {
                    await this.db.PaymentMethod.updateOne(
                        { _id: successor._id },
                        { $set: { isDefault: true } },
                        { session }
                    );
                }
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        const refreshed = await this.readAll(userId);

        return {
            isSuccess: true,
            message: 'payment method deleted',
            paymentMethods: refreshed.paymentMethods,
        };
    }

    async findById(paymentMethodId: string, userId: string): Promise<PaymentMethodDocument> {
        const doc = await this.db.PaymentMethod.findOne({
            _id: paymentMethodId,
            user: userId,
        });

        if (!doc) {
            throw this.notFound();
        }

        return doc;
    }

    async findDefaultForUser(userId: string): Promise<PaymentMethodDocument | null> {
        return this.db.PaymentMethod.findOne({ user: userId, isDefault: true });
    }

    noPaymentMethod(): HttpException {
        return new HttpException('no payment method provided', HttpStatus.BAD_REQUEST);
    }

    chargeFailed(reason: string): HttpException {
        return new HttpException(`payment failed: ${reason}`, HttpStatus.BAD_REQUEST);
    }

    private notFound(): HttpException {
        return new HttpException('payment method not found', HttpStatus.NOT_FOUND);
    }

    private async ensureCustomerId(userId: string, provider: PaymentProviderName): Promise<string> {
        if (!Object.values(PaymentProviderName.STRIPE).includes(provider)) {
            throw new HttpException({ message: `provider not yet supported: ${provider}` }, HttpStatus.BAD_REQUEST);
        }

        const { user } = await this.userService.readById(userId);

        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const strategy = this.paymentService.resolvePaymentProviderStrategy(provider);
        const { customerId } = await strategy.ensureCustomer(userId, user.email);

        await this.userService.setStripeCustomerId(userId, customerId);

        return customerId;
    }
}
