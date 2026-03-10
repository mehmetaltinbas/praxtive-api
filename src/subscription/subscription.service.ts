import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose, { Model } from 'mongoose';
import { BillingService } from 'src/billing/billing.service';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { PlanService } from 'src/plan/plan.service';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';
import { DowngradeSubscriptionDto } from 'src/subscription/types/dto/downgrade-subscription.dto';
import { UpgradeSubscriptionDto } from 'src/subscription/types/dto/upgrade-subscription.dto';
import { CheckPriceToPayOnUpgradeSubscriptionResponse } from 'src/subscription/types/response/check-price-to-pay-on-upgrade-subscription.response';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SubscriptionService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Subscription', Model<SubscriptionDocument>>,
        private userService: UserService,
        private planService: PlanService,
        private creditTransactionService: CreditTransactionService,
        private billingService: BillingService
    ) {}

    // @Cron('0 0 5 * * *')
    @Cron(CronExpression.EVERY_12_HOURS)
    private async processSubscriptions(): Promise<void> {
        console.log('checking subscriptions....');

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
            } catch (error) {
                console.error(`downgrade processing failed for userId: ${userId}`, error);
            }
        }

        const renewalSubs = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: SubscriptionStatus.ACTIVE,
        });

        for (const sub of renewalSubs) {
            try {
                await this.processMonthlyRenewal(sub.user._id);
            } catch (error) {
                console.error(`renewal processing failed for userId: ${sub.user._id}`, error);
            }
        }
    }

    // MAIN Service methods ↓

    async test(): Promise<any> {
        return 'test';
    }

    async upgrade(userId: string, upgradeSubscriptionDto: UpgradeSubscriptionDto): Promise<ResponseBase> {
        const { plan: newPlan } = await this.planService.readByName(upgradeSubscriptionDto.newPlanName);

        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });

        const session = await mongoose.startSession();

        session.startTransaction();

        try {
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
                    status: SubscriptionStatus.UPGRADED_FROM,
                    endedAt: new Date(),
                },
                { session, new: true }
            );

            if (!updatedSub) {
                throw new InternalServerErrorException("current subscription couldn't be updated to end it");
            }

            const nextBillingDate = new Date();

            nextBillingDate.setMonth(new Date().getMonth() + 1);
            activeSubscription.nextBillingDate = nextBillingDate;
            await this.create(
                userId,
                {
                    planName: newPlan.name,
                    nextBillingDate: nextBillingDate,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                },
                session
            );

            const creditsToGrant = Math.min(
                newPlan.monthlyCredits,
                newPlan.maximumCredits - activeSubscription.user.creditBalance
            );

            await this.userService.updateCreditBalance(userId, creditsToGrant, session);

            await this.creditTransactionService.create(
                userId,
                {
                    type: CreditTransactionType.PLAN_UPGRADE,
                    amount: creditsToGrant,
                },
                session
            );

            this.billingService.calculateProrationOnUpgrade(
                activeSubscription.nextBillingDate,
                activeSubscription.plan.monthlyPrice,
                newPlan.monthlyPrice
            );
            // payment processing or anywhere else basically,

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
            message: `renewing processing successfull for userId: ${userId}`,
        };
    }

    private async create(
        userId: string,
        createSubscriptionDto: CreateSubscriptionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const { plan } = await this.planService.readByName(createSubscriptionDto.planName);

        const [subscription] = await this.db.Subscription.create(
            [
                {
                    user: userId,
                    plan: plan._id,
                    nextBillingDate: createSubscriptionDto.nextBillingDate,
                    status: createSubscriptionDto.status,
                },
            ],
            { session }
        );

        if (!subscription) {
            throw new InternalServerErrorException("subscription couldn't be created");
        }

        return { isSuccess: true, message: 'subscription created' };
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

        const creditsToGrant = Math.min(
            activeSub.plan.monthlyCredits,
            activeSub.plan.maximumCredits - activeSub.user.creditBalance
        );

        await this.userService.updateCreditBalance(userId, creditsToGrant, session);

        await this.creditTransactionService.create(
            userId,
            {
                type: CreditTransactionType.MONTHLY,
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
        });

        if (!canceledSub) throw new NotFoundException('canceled subscription not found');
        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });

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
