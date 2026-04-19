import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose from 'mongoose';
import { BillingService } from 'src/billing/billing.service';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { PaymentService } from 'src/payment/payment.service';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { PlanService } from 'src/plan/plan.service';
import ResponseBase from 'src/shared/types/response-base.interface';
import { MAX_RETRIES, RETRY_INTERVALS_DAYS } from 'src/subscription/constants/payment-retry.constants';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';
import { DowngradeSubscriptionDto } from 'src/subscription/types/dto/downgrade-subscription.dto';
import { UpgradeSubscriptionDto } from 'src/subscription/types/dto/upgrade-subscription.dto';
import { CheckPriceToPayOnUpgradeSubscriptionResponse } from 'src/subscription/types/response/check-price-to-pay-on-upgrade-subscription.response';
import { GetActivePlanResponse } from 'src/subscription/types/response/get-active-plan.response';
import { ReadActiveSubscriptionResponse } from 'src/subscription/types/response/read-active-subscription.response';
import { ProcessRetryGracePeriodRetryResponse } from 'src/subscription/types/response/process-grace-period-retry.response';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SubscriptionService {
    private readonly logger = new Logger(SubscriptionService.name);

    constructor(
        @Inject('DB_MODELS') private db: Record<'Subscription', mongoose.Model<SubscriptionDocument>>,
        private userService: UserService,
        private planService: PlanService,
        private creditTransactionService: CreditTransactionService,
        private billingService: BillingService,
        private paymentService: PaymentService
    ) {}

    // @Cron('0 0 5 * * *')
    @Cron(CronExpression.EVERY_12_HOURS)
    private async processSubscriptions(): Promise<void> {
        this.logger.log('Processing subscriptions...');

        const results = {
            downgrades: { success: 0, failed: 0 },
            renewals: { success: 0, failed: 0 },
            retries: { success: 0, failed: 0, downgraded: 0 },
        };

        const aggregationBuckets = await this.db.Subscription.aggregate([
            {
                $match: {
                    nextBillingDate: { $lte: new Date() },
                    status: {
                        $in: [SubscriptionStatus.CANCELED, SubscriptionStatus.PENDING_ACTIVATE],
                    },
                },
            },
            { $group: { _id: '$user' } },
        ]);
        const userIds = aggregationBuckets.map((aggregationBucket: { _id: string }) => aggregationBucket._id);

        for (const userId of userIds) {
            try {
                await this.processDowngrades(userId);
                results.downgrades.success++;
            } catch (error) {
                results.downgrades.failed++;
                this.logger.error(
                    `Downgrade processing failed for userId: ${userId}`,
                    error instanceof Error ? error.stack : error
                );
            }
        }

        const renewalSubs = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: SubscriptionStatus.ACTIVE,
        });

        for (const sub of renewalSubs) {
            try {
                await this.processMonthlyRenewal(sub.user._id);
                results.renewals.success++;
            } catch (error) {
                results.renewals.failed++;
                this.logger.error(
                    `Renewal processing failed for subscriptionId: ${sub._id}, userId: ${sub.user._id}`,
                    error instanceof Error ? error.stack : error
                );
            }
        }

        const gracePeriodSubs = await this.db.Subscription.find({
            status: SubscriptionStatus.GRACE_PERIOD,
        })
            .populate('user')
            .populate('plan');

        for (const sub of gracePeriodSubs) {
            try {
                const retryResult = await this.processGracePeriodRetry(sub);

                if (retryResult === 'success') results.retries.success++;
                else if (retryResult === 'downgraded') results.retries.downgraded++;
                else results.retries.failed++;
            } catch (error) {
                results.retries.failed++;
                this.logger.error(
                    `Grace period retry failed for subscriptionId: ${sub._id}, userId: ${sub.user._id}`,
                    error instanceof Error ? error.stack : error
                );
            }
        }

        this.logger.log(`Cron run complete: ${JSON.stringify(results)}`);
    }

    async createInitialFreeSubscription(userId: string): Promise<ResponseBase> {
        try {
            const nextBillingDate = new Date();

            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await this.create(userId, {
                planName: PlanName.FREE,
                nextBillingDate,
                status: SubscriptionStatus.ACTIVE,
                startedAt: new Date(),
            });

            await this.grantMonthlyCreditsUponActiveSub(userId);

            this.logger.log(`Free subscription created for new user: ${userId}`);

            return { isSuccess: true, message: 'Free subscription created.' };
        } catch (error) {
            this.logger.error(
                `Failed to create free subscription for user: ${userId}`,
                error instanceof Error ? error.stack : error
            );

            return { isSuccess: false, message: 'Failed to create free subscription.' };
        }
    }

    // MAIN Service methods ↓

    async upgrade(userId: string, upgradeSubscriptionDto: UpgradeSubscriptionDto): Promise<ResponseBase> {
        const { plan: newPlan } = await this.planService.readByName(upgradeSubscriptionDto.newPlanName);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            const pendingActivateSub = await this.db.Subscription.findOne({
                user: userId,
                status: SubscriptionStatus.PENDING_ACTIVATE,
            }).session(session);

            if (pendingActivateSub) {
                await this.cancelDowngradeWithSession(userId, session);
            }

            const activeSubscription = await this.db.Subscription.findOne({
                user: userId,
                status: SubscriptionStatus.ACTIVE,
            })
                .populate('user')
                .populate('plan')
                .session(session);

            if (!activeSubscription) {
                throw new NotFoundException('no active subscription found');
            }

            await this.planService.validateIsHigher(activeSubscription.plan.name, newPlan.name);

            const updatedSub = await this.db.Subscription.findOneAndUpdate(
                {
                    user: userId,
                    status: SubscriptionStatus.ACTIVE,
                },
                {
                    status: SubscriptionStatus.EXPIRED,
                    endedAt: new Date(),
                },
                { session, new: true }
            );

            if (!updatedSub) {
                throw new InternalServerErrorException("current subscription couldn't be updated to end it");
            }

            const nextBillingDate = new Date();

            nextBillingDate.setMonth(new Date().getMonth() + 1);
            const newSubscription = await this.create(
                userId,
                {
                    planName: newPlan.name,
                    nextBillingDate: nextBillingDate,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                },
                session
            );

            const creditsToGrant = Math.max(
                0,
                Math.min(newPlan.monthlyCredits, newPlan.maximumCredits - activeSubscription.user.creditBalance)
            );

            await this.userService.incrementCreditBalance(userId, creditsToGrant, session);

            await this.creditTransactionService.create(
                userId,
                {
                    type: CreditTransactionType.PLAN_UPGRADE_GRANT,
                    amount: creditsToGrant,
                },
                session
            );

            const prorationResult = this.billingService.calculateProrationOnUpgrade(
                activeSubscription.nextBillingDate,
                activeSubscription.plan.monthlyPrice,
                newPlan.monthlyPrice
            );

            if (prorationResult.prorationedPriceToPay > 0) {
                if (!upgradeSubscriptionDto.paymentProvider || !upgradeSubscriptionDto.paymentMethodToken) {
                    throw new BadRequestException(
                        'paymentProvider and paymentMethodToken are required for paid upgrades'
                    );
                }

                const { createdPayment: payment } = await this.paymentService.create(
                    userId,
                    newSubscription._id,
                    prorationResult.prorationedPriceToPay,
                    newPlan.currency,
                    upgradeSubscriptionDto.paymentProvider,
                    session
                );

                const provider = this.paymentService.resolvePaymentProviderStrategy(
                    upgradeSubscriptionDto.paymentProvider
                );
                const chargeResult = await provider.charge({
                    amount: prorationResult.prorationedPriceToPay,
                    currency: newPlan.currency,
                    paymentMethodToken: upgradeSubscriptionDto.paymentMethodToken,
                    description: `Upgrade to ${newPlan.name} plan`,
                    metadata: { userId, subscriptionId: newSubscription._id },
                });

                if (!chargeResult.success) {
                    await this.paymentService.markFailed(
                        payment._id,
                        chargeResult.failureReason || 'Payment failed',
                        session
                    );
                    throw new BadRequestException(`Payment failed: ${chargeResult.failureReason || 'Unknown error'}`);
                }

                await this.paymentService.markSucceeded(payment._id, chargeResult.providerTransactionId!, session);

                // store payment info on subscription for future renewals
                await this.db.Subscription.findByIdAndUpdate(
                    newSubscription._id,
                    {
                        lastPaymentProvider: upgradeSubscriptionDto.paymentProvider,
                        lastPaymentMethodToken: upgradeSubscriptionDto.paymentMethodToken,
                    },
                    { session }
                );
            }

            await session.commitTransaction();

            return { isSuccess: true, message: 'subscription upgrade successful' };
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Handles turning an active subscription into a lower-tier plan.
     * The current subscription stays active until the next billing cycle,
     * after which the new plan becomes effective.
     */
    async downgrade(userId: string, downgradeSubscriptionDto: DowngradeSubscriptionDto): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan');

        if (!activeSubscription) {
            throw new NotFoundException("user doesn't have an active subscription");
        }

        const { plan: newPlan } = await this.planService.readByName(downgradeSubscriptionDto.newPlanName);

        await this.planService.validateIsLower(activeSubscription.plan.name, newPlan.name);

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.cancelActiveSubscription(userId, session);

            await this.create(
                userId,
                {
                    planName: newPlan.name,
                    nextBillingDate: activeSubscription.nextBillingDate,
                    status: SubscriptionStatus.PENDING_ACTIVATE,
                },
                session
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: 'successfully downgraded' };
    }

    async checkPriceToPayOnUpgrade(
        userId: string,
        upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<CheckPriceToPayOnUpgradeSubscriptionResponse> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan');

        if (!activeSubscription) {
            throw new NotFoundException("user doesn't have an active subscription");
        }

        const { plan: newPlan } = await this.planService.readByName(upgradeSubscriptionDto.newPlanName);

        await this.planService.validateIsHigher(activeSubscription.plan.name, newPlan.name);

        const calculateProrationResponse = this.billingService.calculateProrationOnUpgrade(
            activeSubscription.nextBillingDate,
            activeSubscription.plan.monthlyPrice,
            newPlan.monthlyPrice
        );

        return {
            isSuccess: true,
            message: 'price to pay successfully calculated',
            priceToPay: calculateProrationResponse.prorationedPriceToPay,
        };
    }

    async cancelDowngrade(userId: string): Promise<ResponseBase> {
        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.cancelDowngradeWithSession(userId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: 'successfully canceled downgrade' };
    }

    async readActive(userId: string): Promise<ReadActiveSubscriptionResponse> {
        const subscription = await this.db.Subscription.findOne({
            user: userId,
            status: {
                $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED, SubscriptionStatus.GRACE_PERIOD],
            },
        }).populate('plan');

        const pendingSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        }).populate('plan');

        return {
            isSuccess: true,
            message: 'active subscription read',
            subscription: subscription ?? undefined,
            pendingSubscription: pendingSubscription ?? undefined,
        };
    }

    async getActivePlanForUser(userId: string): Promise<GetActivePlanResponse> {
        const subscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        }).populate('plan');

        if (!subscription || !subscription.plan) {
            throw new NotFoundException('No active subscription found for user');
        }

        return { isSuccess: true, message: 'Active plan retrieved.', plan: subscription.plan };
    }

    // HELPERS ↓

    private async processDowngrades(userId: string): Promise<ResponseBase> {
        const canceledSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.CANCELED,
        });

        if (!canceledSub) {
            throw new NotFoundException(`canceledSub not found for userId: ${userId}`);
        }

        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });

        if (!pendingActivateSub) {
            throw new NotFoundException(`pendingActivateSub not found for userId: ${userId}`);
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.expire(canceledSub, session);
            await this.activate(pendingActivateSub, session);
            await this.grantMonthlyCreditsUponActiveSub(userId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }

        return { isSuccess: true, message: 'downgrade processing successfull' };
    }

    private async processMonthlyRenewal(userId: string): Promise<ResponseBase> {
        const activeSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        }).populate('plan');

        if (!activeSub) {
            throw new NotFoundException("user doesn't have an active subscription for renewal");
        }

        // For paid plans, attempt payment before granting credits
        if (activeSub.plan.monthlyPrice > 0 && activeSub.lastPaymentProvider && activeSub.lastPaymentMethodToken) {
            const provider = this.paymentService.resolvePaymentProviderStrategy(activeSub.lastPaymentProvider);
            const { createdPayment: payment } = await this.paymentService.create(
                userId,
                activeSub._id,
                activeSub.plan.monthlyPrice,
                activeSub.plan.currency,
                activeSub.lastPaymentProvider
            );

            const chargeResult = await provider.charge({
                amount: activeSub.plan.monthlyPrice,
                currency: activeSub.plan.currency,
                paymentMethodToken: activeSub.lastPaymentMethodToken,
                description: `Monthly renewal for ${activeSub.plan.name} plan`,
                metadata: { userId, subscriptionId: activeSub._id },
            });

            if (!chargeResult.success) {
                await this.paymentService.markFailed(payment._id, chargeResult.failureReason || 'Payment failed');

                // Enter grace period
                const gracePeriodEnd = new Date();

                gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

                await this.db.Subscription.findByIdAndUpdate(activeSub._id, {
                    status: SubscriptionStatus.GRACE_PERIOD,
                    paymentRetryCount: 1,
                    lastPaymentAttempt: new Date(),
                    gracePeriodEnd,
                });

                this.logger.warn(`Payment failed for userId: ${userId}, entering grace period`);

                return { isSuccess: false, message: 'payment failed, entering grace period' };
            }

            await this.paymentService.markSucceeded(payment._id, chargeResult.providerTransactionId!);
        }

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.grantMonthlyCreditsUponActiveSub(userId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();

            throw error;
        } finally {
            await session.endSession();
        }

        return {
            isSuccess: true,
            message: `renewal processing successful for userId: ${userId}`,
        };
    }

    private async processGracePeriodRetry(sub: SubscriptionDocument): Promise<ProcessRetryGracePeriodRetryResponse> {
        const retryIndex = sub.paymentRetryCount - 1;

        if (retryIndex < 0 || retryIndex >= RETRY_INTERVALS_DAYS.length) {
            // exceeded max retries, downgrade to free
            return this.downgradeToFree(sub);
        }

        const daysSinceLastAttempt = sub.lastPaymentAttempt
            ? Math.floor((Date.now() - sub.lastPaymentAttempt.getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;

        if (daysSinceLastAttempt < RETRY_INTERVALS_DAYS[retryIndex]) {
            return 'failed'; // Not yet time to retry
        }

        if (!sub.lastPaymentProvider || !sub.lastPaymentMethodToken) {
            this.logger.warn(`No payment info for grace period sub: ${sub._id}, downgrading to free`);

            return this.downgradeToFree(sub);
        }

        const provider = this.paymentService.resolvePaymentProviderStrategy(sub.lastPaymentProvider);
        const { createdPayment: payment } = await this.paymentService.create(
            sub.user._id,
            sub._id,
            sub.plan.monthlyPrice,
            sub.plan.currency,
            sub.lastPaymentProvider
        );

        const chargeResult = await provider.charge({
            amount: sub.plan.monthlyPrice,
            currency: sub.plan.currency,
            paymentMethodToken: sub.lastPaymentMethodToken,
            description: `Retry payment for ${sub.plan.name} plan`,
            metadata: { userId: sub.user._id, subscriptionId: sub._id },
        });

        if (chargeResult.success) {
            await this.paymentService.markSucceeded(payment._id, chargeResult.providerTransactionId!);

            const session = await mongoose.startSession();

            session.startTransaction();

            try {
                await this.db.Subscription.findByIdAndUpdate(
                    sub._id,
                    {
                        status: SubscriptionStatus.ACTIVE,
                        paymentRetryCount: 0,
                        lastPaymentAttempt: null,
                        gracePeriodEnd: null,
                    },
                    { session }
                );

                await this.grantMonthlyCreditsUponActiveSub(sub.user._id, session);

                await session.commitTransaction();
            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                await session.endSession();
            }

            this.logger.log(`Grace period retry succeeded for subscriptionId: ${sub._id}`);

            return 'success';
        }

        await this.paymentService.markFailed(payment._id, chargeResult.failureReason || 'Payment failed');

        const newRetryCount = sub.paymentRetryCount + 1;

        if (newRetryCount > MAX_RETRIES) {
            return this.downgradeToFree(sub);
        }

        await this.db.Subscription.findByIdAndUpdate(sub._id, {
            paymentRetryCount: newRetryCount,
            lastPaymentAttempt: new Date(),
        });

        this.logger.warn(
            `Grace period retry ${sub.paymentRetryCount}/${MAX_RETRIES} failed for subscriptionId: ${sub._id}`
        );

        return 'failed';
    }

    private async downgradeToFree(sub: SubscriptionDocument): Promise<'downgraded'> {
        const session = await mongoose.startSession();

        session.startTransaction();

        try {
            await this.db.Subscription.findByIdAndUpdate(
                sub._id,
                {
                    status: SubscriptionStatus.EXPIRED,
                    endedAt: new Date(),
                    paymentRetryCount: 0,
                    lastPaymentAttempt: null,
                    gracePeriodEnd: null,
                },
                { session }
            );

            const { plan: freePlan } = await this.planService.readByName(PlanName.FREE);
            const nextBillingDate = new Date();

            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await this.create(
                sub.user._id,
                {
                    planName: freePlan.name,
                    nextBillingDate,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                },
                session
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

        this.logger.warn(`Subscription ${sub._id} downgraded to free after exhausting payment retries`);

        return 'downgraded';
    }

    private async create(
        userId: string,
        createSubscriptionDto: CreateSubscriptionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<SubscriptionDocument> {
        const uniqueStatuses = [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELED,
            SubscriptionStatus.PENDING_ACTIVATE,
        ];

        if (uniqueStatuses.includes(createSubscriptionDto.status)) {
            const existing = await this.db.Subscription.findOne({
                user: userId,
                status: createSubscriptionDto.status,
            }).session(session ?? null);

            if (existing) {
                throw new ConflictException(
                    `User already has a subscription with status: ${createSubscriptionDto.status}`
                );
            }
        }

        const { plan } = await this.planService.readByName(createSubscriptionDto.planName);

        const [subscription] = await this.db.Subscription.create(
            [
                {
                    user: userId,
                    plan: plan._id,
                    nextBillingDate: createSubscriptionDto.nextBillingDate,
                    status: createSubscriptionDto.status,
                    startedAt: createSubscriptionDto.startedAt,
                },
            ],
            { session }
        );

        if (!subscription) {
            throw new InternalServerErrorException("subscription couldn't be created");
        }

        return subscription;
    }

    private async grantMonthlyCreditsUponActiveSub(
        userId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const activeSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan')
            .session(session ?? null);

        if (!activeSub) {
            throw new NotFoundException("user doesn't have an active subscription");
        }

        const creditsToGrant = Math.max(
            0,
            Math.min(activeSub.plan.monthlyCredits, activeSub.plan.maximumCredits - activeSub.user.creditBalance)
        );

        await this.userService.incrementCreditBalance(userId, creditsToGrant, session);

        await this.creditTransactionService.create(
            userId,
            {
                type: CreditTransactionType.MONTHLY_GRANT,
                amount: creditsToGrant,
            },
            session
        );

        const nextBillingDate = new Date();

        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        const updatedSubscription = await this.db.Subscription.findOneAndUpdate(
            {
                _id: activeSub._id,
                user: userId,
            },
            {
                nextBillingDate,
            },
            {
                new: true,
                session,
            }
        );

        if (!updatedSubscription) {
            throw new InternalServerErrorException('subscription update failure');
        }

        return { isSuccess: true, message: 'monthly credits granted' };
    }

    private async cancelActiveSubscription(
        userId: string,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        }).session(session || null);

        if (!activeSubscription) {
            throw new NotFoundException('no subscription found to cancel');
        }

        activeSubscription.status = SubscriptionStatus.CANCELED;
        activeSubscription.canceledAt = new Date();
        activeSubscription.isNew = false;
        await activeSubscription.save({ session });

        return { isSuccess: true, message: 'subscription canceled' };
    }

    private async expire(
        subscription: SubscriptionDocument,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        subscription.status = SubscriptionStatus.EXPIRED;
        subscription.endedAt = new Date();
        await subscription.save({ session });

        return { isSuccess: true, message: 'subscription expired' };
    }

    private async activate(
        subscription: SubscriptionDocument,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.startedAt = new Date();
        await subscription.save({ session });

        return { isSuccess: true, message: 'subscription activated' };
    }

    private async cancelDowngradeWithSession(
        userId: string,
        session: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const canceledSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.CANCELED,
        }).session(session);

        if (!canceledSub) throw new NotFoundException('canceled subscription not found');
        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        }).session(session);

        if (!pendingActivateSub) throw new NotFoundException('pending activate subscription not found');

        canceledSub.status = SubscriptionStatus.ACTIVE;
        canceledSub.canceledAt = undefined;
        canceledSub.isNew = false;
        await canceledSub.save({ session });

        const deleteResult = await this.db.Subscription.deleteOne(
            {
                user: userId,
                status: SubscriptionStatus.PENDING_ACTIVATE,
            },
            { session }
        );

        if (!deleteResult.acknowledged) {
            throw new InternalServerErrorException("pending activate subscription couldn't be deleted");
        }

        return { isSuccess: true, message: 'downgrade canceled' };
    }
}
