import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose, { Model } from 'mongoose';
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
        private creditTransactionService: CreditTransactionService
    ) {}

    // @Cron('0 0 5 * * *')
    @Cron(CronExpression.EVERY_30_SECONDS)
    private async processSubscriptions(): Promise<void> {
        // TODO: transaction
        console.log('checking subscriptions....');
        const subscriptions = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: {
                $in: [SubscriptionStatus.CANCELED, SubscriptionStatus.PENDING_ACTIVATE],
            },
        })
            .populate('user')
            .populate('plan');

        const canceledSubscriptions = subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.CANCELED
        );
        const expirations = canceledSubscriptions.map((subscription) =>
            this.expire(subscription)
        );
        const expirationResponses = await Promise.all(expirations);

        const pendingActivateSubscriptions = subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.PENDING_ACTIVATE
        );
        const activates = pendingActivateSubscriptions.map((subscription) =>
            this.activate(subscription)
        );
        const activateResponses = await Promise.all(activates);

        const activeSubscriptions = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: { $in: [SubscriptionStatus.ACTIVE] },
        })
            .populate('user')
            .populate('plan');
        const renewings = activeSubscriptions.map((subscription, index) =>
            this.grantMonthlyCredits(subscription.user._id, subscription.plan.monthlyCredits)
        );
        const renewingsResponses = await Promise.all(renewings);
    }

    // MAIN Service methods ↓

    async upgrade(
        userId: string,
        upgradeSubscriptionDto: UpgradeSubscriptionDto
    ): Promise<ResponseBase> {
        // TODO: handle the scenario when user wants to upgrade when there is already a canceled sub,
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan');
        if (!activeSubscription)
            return { isSuccess: false, message: "user doesn't have an active subscription" };

        const readNewPlanResponse = await this.planService.readByName(
            upgradeSubscriptionDto.newPlanName
        );
        if (!readNewPlanResponse.isSuccess || !readNewPlanResponse.plan)
            return readNewPlanResponse;

        const higherPlanVerificationResponse = await this.planService.validateIsHigher(
            activeSubscription.plan.name,
            readNewPlanResponse.plan.name
        );
        if (!higherPlanVerificationResponse.isSuccess) return higherPlanVerificationResponse;

        const diffMs = activeSubscription.nextBillingDate.getTime() - new Date().getTime();
        const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const unusedPrice = activeSubscription.plan.monthlyPrice * (remainingDays / 30);
        const priceToPay = Number(
            (readNewPlanResponse.plan.monthlyPrice - unusedPrice).toFixed(2)
        );
        // payment processing

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(new Date().getMonth() + 1);
            activeSubscription.nextBillingDate = nextBillingDate;
            await this.db.Subscription.findOneAndUpdate(
                {
                    user: userId,
                    status: SubscriptionStatus.ACTIVE,
                },
                {
                    plan: readNewPlanResponse.plan._id,
                    nextBillingDate,
                },
                { session }
            );

            const creditsToGrant =
                activeSubscription.user.creditBalance +
                    readNewPlanResponse.plan.monthlyCredits >
                readNewPlanResponse.plan.monthlyCredits
                    ? readNewPlanResponse.plan.monthlyCredits -
                      activeSubscription.user.creditBalance
                    : readNewPlanResponse.plan.monthlyCredits;
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

        const diffMs = activeSubscription.nextBillingDate.getTime() - new Date().getTime();
        const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const unusedPrice = activeSubscription.plan.monthlyPrice * (remainingDays / 30);
        const priceToPay = Number(
            (readNewPlanResponse.plan.monthlyPrice - unusedPrice).toFixed(2)
        );

        return {
            isSuccess: true,
            message: 'price to pay successfully calculated',
            priceToPay,
        };
    }

    // HELPERS ↓

    private async create(
        userId: string,
        createSubscriptionDto: CreateSubscriptionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        }).session(session || null);
        if (activeSubscription) {
            return { isSuccess: false, message: 'user already has a subscription' };
        }

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

    private async grantMonthlyCredits(
        userId: string,
        monthlyCredits: number,
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

        const availableCreditSpace =
            activeSub.plan.maximumCredits - activeSub.user.creditBalance;
        const creditsToGrant =
            availableCreditSpace <= monthlyCredits ? availableCreditSpace : monthlyCredits;
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
        await subscription.save({ session });

        return { isSuccess: true, message: 'subscription expired' };
    }

    private async activate(
        subscription: SubscriptionDocument,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        subscription.status = SubscriptionStatus.ACTIVE;
        await subscription.save({ session });

        return { isSuccess: true, message: 'subscription activated' };
    }
}
