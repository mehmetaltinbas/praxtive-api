import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose, { Model } from 'mongoose';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { PlanName } from 'src/plan/enums/plan-name.enum';
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
        console.log('checking subscriptions....');
        const subscriptions = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED] },
        })
            .populate('user')
            .populate('plan');

        const activeSubscriptions = subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.ACTIVE
        );
        const canceledSubscriptions = subscriptions.filter(
            (subscription) => subscription.status === SubscriptionStatus.CANCELED
        );

        const renewings = activeSubscriptions.map((subscription, index) =>
            this.grantMonthlyCredits(
                subscription.user._id,
                subscription.plan.monthlyCredits
            )
        );
        await Promise.all(renewings);

        const expirations = canceledSubscriptions.map((subscription) =>
            this.expireAndCreateFreePlanSubscription(subscription)
        );
        const expirationResponses = await Promise.all(expirations);
        console.log(expirationResponses);
    }

    private async grantMonthlyCredits(
        userId: string,
        monthlyCredits: number,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        // console.log(`subscriptionId: ${subscriptionId}, userId: ${userId}, monthlyCredits: ${monthlyCredits}`);
        const subscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        })
            .populate('user')
            .populate('plan')
            .session(session ?? null);
        if (!subscription) {
            return {
                isSuccess: false,
                message: "user doesn't have an active subscription",
            };
        }

        const availableCreditSpace =
            subscription.plan.maximumCredits - subscription.user.creditBalance;
        const creditsToGrant =
            availableCreditSpace <= monthlyCredits ? availableCreditSpace : monthlyCredits;
        const updateUserDto: UpdateUserDto = {
            creditBalance: subscription.user.creditBalance + creditsToGrant,
        };
        const updateUserResponse = await this.userService.updateById(
            userId,
            updateUserDto,
            session
        );
        if (!updateUserResponse.isSuccess) {
            console.log('unsucessful user update');
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
            console.log('unsucessful credit transaction create');
            return createCreditTransactionResponse;
        }
        console.log('updating user and creating credit transaction are successfull until now');
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        const updatedSubscription = await this.db.Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
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

    async create(
        userId: string,
        createSubscriptionDto: CreateSubscriptionDto,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        });
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
                    nextBillingDate: new Date(),
                    status: SubscriptionStatus.ACTIVE,
                },
            ],
            { session }
        );
        if (!subscription) {
            return { isSuccess: false, message: "subscription couldn't created" };
        }

        return { isSuccess: true, message: 'subscription created' };
    }

    // async createAndGrantMonthlyCredits(
    //     userId: string,
    //     createSubscriptionDto: CreateSubscriptionDto
    // ): Promise<ResponseBase> {

    // }

    async cancel(userId: string): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        });
        if (!activeSubscription) {
            return { isSuccess: false, message: 'no subscription found to cancel' };
        }

        activeSubscription.status = SubscriptionStatus.CANCELED;
        activeSubscription.canceledAt = new Date();
        activeSubscription.isNew = false;
        await activeSubscription.save();
        return { isSuccess: true, message: 'subscription canceled' };
    }

    private async expireAndCreateFreePlanSubscription(
        subscription: SubscriptionDocument
    ): Promise<ResponseBase> {
        const readFreePlanResponse = await this.planService.readByName(PlanName.FREE);
        if (!readFreePlanResponse.isSuccess || !readFreePlanResponse.plan) {
            return readFreePlanResponse;
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (readFreePlanResponse.plan.maximumCredits < subscription.user.creditBalance) {
                const updateUserDto: UpdateUserDto = {
                    creditBalance: readFreePlanResponse.plan.maximumCredits,
                };
                const updateUserResponse = await this.userService.updateById(
                    subscription.user._id,
                    updateUserDto,
                    session
                );
                if (!updateUserResponse.isSuccess) {
                    await session.abortTransaction();
                    return updateUserResponse;
                }
            }

            subscription.status = SubscriptionStatus.EXPIRED;
            await subscription.save({ session });

            const createSubscriptionResponse = await this.create(
                subscription.user._id,
                {
                    planName: PlanName.FREE,
                },
                session
            );
            if (!createSubscriptionResponse.isSuccess) {
                await session.abortTransaction();
                return createSubscriptionResponse;
            }

            const grantMonthlyCreditsResponse = await this.grantMonthlyCredits(
                subscription.user._id,
                readFreePlanResponse.plan.monthlyCredits,
                session
            );
            if (!grantMonthlyCreditsResponse.isSuccess) {
                await session.abortTransaction();
                return grantMonthlyCreditsResponse;
            }

            await session.commitTransaction();
            return { isSuccess: true, message: 'subscription expired' };
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `transaction failed, error: ${JSON.stringify(error, null, 2)}`,
            };
        } finally {
            await session.endSession();
        }
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

        const higherPlanVerificationResponse = await this.planService.verifyHigher(
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

    async upgrade(
        userId: string,
        upgradeSubscriptionDto: UpgradeSubscriptionDto
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
            upgradeSubscriptionDto.newPlanName
        );
        if (!readNewPlanResponse.isSuccess || !readNewPlanResponse.plan) {
            return readNewPlanResponse;
        }

        const higherPlanVerificationResponse = await this.planService.verifyHigher(
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

        return { isSuccess: true, message: 'successfully downgraded' };
    }
}
