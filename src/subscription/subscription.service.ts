import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose, { Model } from 'mongoose';
import { BillingService } from 'src/billing/billing.service';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { PlanService } from 'src/plan/plan.service';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';
import { DowngradeSubscriptionDto } from 'src/subscription/types/dto/downgrade-subscription.dto';
import { UpgradeSubscriptionDto } from 'src/subscription/types/dto/upgrade-subscription.dto';
import { CheckPriceToPayOnUpgradeSubscriptionResponse } from 'src/subscription/types/response/check-price-to-pay-on-upgrade-subscription.response';
import { SubscriptionDocument } from 'src/subscription/types/subscription-document.interface';
import { UpdateUserDto } from 'src/user/types/dto/update-user.dto';
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
                        $in: [
                            SubscriptionStatus.CANCELED,
                            SubscriptionStatus.PENDING_ACTIVATE,
                        ],
                    },
                },
            },
            { $group: { _id: '$user' } },
        ]);
        const userIds = aggregationBuckets.map(
            (aggregationBucket: { _id: string }) => aggregationBucket._id
        );

        const downgrades = userIds.map((userId) => this.processDowngrades(userId));
        const downgradeResponses = await Promise.all(downgrades);
        downgradeResponses.forEach(
            (downgradeResponse) =>
                !downgradeResponse.isSuccess && console.log(downgradeResponse.message)
        );

        const renewalSubs = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: SubscriptionStatus.ACTIVE,
        });
        const renewals = renewalSubs.map((sub) => this.processMonthlyRenewal(sub.user._id));
        const renewalResponses = await Promise.all(renewals);
        renewalResponses.forEach(
            (renewalResponse) =>
                !renewalResponse.isSuccess && console.log(renewalResponse.message)
        );
    }

    // MAIN Service methods ↓

    async test(): Promise<any> {
        return 'test';
    }

    async upgrade(
        userId: string,
        upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<ResponseBase> {
        const readNewPlanResponse = await this.planService.readByName(
            upgradeSubscriptionDto.newPlanName
        );
        if (!readNewPlanResponse.isSuccess || !readNewPlanResponse.plan)
            return readNewPlanResponse;

        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (pendingActivateSub) {
                const cancelDowngradeResponse = await this.cancelDowngradeWithSession(userId, session);
                if (!cancelDowngradeResponse.isSuccess) { 
                    await session.abortTransaction();
                    return cancelDowngradeResponse;
                }
            }

            const activeSubscription = await this.db.Subscription.findOne({
                user: userId,
                status: SubscriptionStatus.ACTIVE,
            })
                .populate('user')
                .populate('plan')
                .session(session);
            if (!activeSubscription) {
                await session.abortTransaction();
                return { isSuccess: false, message: 'no active sub found' };
            }

            const higherPlanVerificationResponse = await this.planService.validateIsHigher(
                activeSubscription.plan.name,
                readNewPlanResponse.plan.name
            );
            if (!higherPlanVerificationResponse.isSuccess)
                return higherPlanVerificationResponse;

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
                await session.abortTransaction();
                return { isSuccess: false, message: "current sub couldn't updated to end it" };
            }

            const nextBillingDate = new Date();
            nextBillingDate.setMonth(new Date().getMonth() + 1);
            activeSubscription.nextBillingDate = nextBillingDate;
            const subCreateResponse = await this.create(
                userId,
                {
                    planName: readNewPlanResponse.plan.name,
                    nextBillingDate: nextBillingDate,
                    status: SubscriptionStatus.ACTIVE,
                    startedAt: new Date(),
                },
                session
            );
            if (!subCreateResponse.isSuccess) {
                await session.abortTransaction();
                return subCreateResponse;
            }

            const creditsToGrant = Math.min(
                readNewPlanResponse.plan.monthlyCredits,
                readNewPlanResponse.plan.maximumCredits - activeSubscription.user.creditBalance
            );
            const updateUserResponse = await this.userService.updateById(
                userId,
                {
                    creditBalance: activeSubscription.user.creditBalance + creditsToGrant,
                },
                session
            );
            if (!updateUserResponse.isSuccess) {
                await session.abortTransaction();
                return updateUserResponse;
            }

            const createCreditTransactionResponse = await this.creditTransactionService.create(
                userId,
                {
                    type: CreditTransactionType.PLAN_UPGRADE,
                    amount: creditsToGrant,
                },
                session
            );
            if (!createCreditTransactionResponse.isSuccess) {
                await session.abortTransaction();
                return createCreditTransactionResponse;
            }

            const calculateProrationResponse = this.billingService.calculateProrationOnUpgrade(
                activeSubscription.nextBillingDate,
                activeSubscription.plan.monthlyPrice,
                readNewPlanResponse.plan.monthlyPrice
            );
            if (!calculateProrationResponse.isSuccess) return calculateProrationResponse;
            // payment processing or anywhere else basically,

            await session.commitTransaction();
            return { isSuccess: true, message: 'subscription upgrade successful' };
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `internal server error, ${JSON.stringify(error, null, 2)}`,
            };
        } finally {
            await session.endSession();
        }
    }

    /**
     * Handles turning an active subscription into a lower-tier plan.
     * The current subscription stays active until the next billing cycle,
     * after which the new plan becomes effective.
     */
    async downgrade(
        userId: string,
        downgradeSubscriptionDto: DowngradeSubscriptionDto
    ): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan');
        if (!activeSubscription) {
            return { isSuccess: false, message: "user doesn't have an active subscription" };
        }

        const readNewPlanResponse = await this.planService.readByName(
            downgradeSubscriptionDto.newPlanName
        );
        if (!readNewPlanResponse.isSuccess || !readNewPlanResponse.plan) {
            return readNewPlanResponse;
        }

        const validateLowerPlanResponse = await this.planService.validateIsLower(
            activeSubscription.plan.name,
            readNewPlanResponse.plan.name
        );
        if (!validateLowerPlanResponse) return validateLowerPlanResponse;

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const cancelActiveSubResponse = await this.cancelActiveSubscription(
                userId,
                session
            );
            if (!cancelActiveSubResponse.isSuccess) {
                return cancelActiveSubResponse;
            }

            const createNewSubResponse = await this.create(
                userId,
                {
                    planName: readNewPlanResponse.plan.name,
                    nextBillingDate: activeSubscription.nextBillingDate,
                    status: SubscriptionStatus.PENDING_ACTIVATE,
                },
                session
            );
            if (!createNewSubResponse.isSuccess) {
                return createNewSubResponse;
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `internal server error: ${JSON.stringify(error, null, 2)}`,
            };
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
            return { isSuccess: false, message: "user doesn't have an active subscription" };
        }

        const readNewPlanResponse = await this.planService.readByName(
            upgradeSubscriptionDto.newPlanName
        );
        if (!readNewPlanResponse.isSuccess || !readNewPlanResponse.plan) {
            return readNewPlanResponse;
        }

        const higherPlanVerificationResponse = await this.planService.validateIsHigher(
            activeSubscription.plan.name,
            readNewPlanResponse.plan.name
        );
        if (!higherPlanVerificationResponse.isSuccess) {
            return higherPlanVerificationResponse;
        }

        const calculateProrationResponse = this.billingService.calculateProrationOnUpgrade(
            activeSubscription.nextBillingDate,
            activeSubscription.plan.monthlyPrice,
            readNewPlanResponse.plan.monthlyPrice
        );
        if (!calculateProrationResponse.isSuccess) return calculateProrationResponse;

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
            const response = await this.cancelDowngradeWithSession(userId, session);
            if (!response.isSuccess) {
                await session.abortTransaction();
                return response;
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return { isSuccess: false, message: 'canceling downgrade unsucessfull' };
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
        if (!canceledSub)
            return {
                isSuccess: false,
                message: `canceledSub not found for userId: ${userId}`,
            };
        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });
        if (!pendingActivateSub)
            return {
                isSuccess: false,
                message: `pendingActivateSub not found for userId: ${userId}`,
            };

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const expirationResponse = await this.expire(canceledSub, session);
            if (!expirationResponse.isSuccess) {
                await session.abortTransaction();
                return expirationResponse;
            }
            const activationResponse = await this.activate(pendingActivateSub, session);
            if (!activationResponse) {
                await session.abortTransaction();
                return activationResponse;
            }
            const grantMonthlyCreditsUponActiveSubResponse =
                await this.grantMonthlyCreditsUponActiveSub(userId, session);
            if (!grantMonthlyCreditsUponActiveSubResponse.isSuccess) {
                await session.abortTransaction();
                return grantMonthlyCreditsUponActiveSubResponse;
            }
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `downgrade processing unsuccessfull for userId: ${userId}`,
            };
        } finally {
            await session.endSession();
        }
        return { isSuccess: true, message: 'downgrade processing successfull' };
    }

    private async processMonthlyRenewal(userId: string): Promise<ResponseBase> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const grantMonthlyCreditsUponActiveSubResponse =
                await this.grantMonthlyCreditsUponActiveSub(userId, session);
            if (!grantMonthlyCreditsUponActiveSubResponse.isSuccess) {
                await session.abortTransaction();
                return grantMonthlyCreditsUponActiveSubResponse;
            }
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `renewing processing unsuccessfull for userId: ${userId}`,
            };
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
        const readSinglePlanResponse = await this.planService.readByName(
            createSubscriptionDto.planName
        );
        if (!readSinglePlanResponse.isSuccess || !readSinglePlanResponse.plan) {
            return readSinglePlanResponse;
        }

        const [subscription] = await this.db.Subscription.create(
            [
                {
                    user: userId,
                    plan: readSinglePlanResponse.plan._id,
                    nextBillingDate: createSubscriptionDto.nextBillingDate,
                    status: createSubscriptionDto.status,
                },
            ],
            { session }
        );
        if (!subscription) {
            return { isSuccess: false, message: "subscription couldn't created" };
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
            return {
                isSuccess: false,
                message: "user doesn't have an active subscription",
            };
        }

        const creditsToGrant = Math.min(
            activeSub.plan.monthlyCredits,
            activeSub.plan.maximumCredits - activeSub.user.creditBalance
        );
        const updateUserDto: UpdateUserDto = {
            creditBalance: activeSub.user.creditBalance + creditsToGrant,
        };

        const updateUserResponse = await this.userService.updateById(
            userId,
            updateUserDto,
            session
        );
        if (!updateUserResponse.isSuccess) {
            return updateUserResponse;
        }

        const createCreditTransactionResponse = await this.creditTransactionService.create(
            userId,
            {
                type: CreditTransactionType.MONTHLY,
                amount: creditsToGrant,
            },
            session
        );
        if (!createCreditTransactionResponse.isSuccess) {
            return createCreditTransactionResponse;
        }

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
            return { isSuccess: false, message: 'subscription update failure' };
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
            return { isSuccess: false, message: 'no subscription found to cancel' };
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
        if (!canceledSub) return { isSuccess: false, message: 'canceled sub not found' };
        const pendingActivateSub = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.PENDING_ACTIVATE,
        });
        if (!pendingActivateSub)
            return { isSuccess: false, message: 'pendingActivateSub not found' };

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
            await session.abortTransaction();
            return { isSuccess: false, message: "pending activate couldn't deleted" };
        }
        return { isSuccess: true, message: 'downgrade canceled' };
    }
}
