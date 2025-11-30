import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import mongoose, { Model } from 'mongoose';
import { CreditTransactionType } from 'src/billing/enums/credit-transaction-type.enum';
import { CreditTransactionService } from 'src/credit-transaction/credit-transaction.service';
import { PlanService } from 'src/plan/plan.service';
import ResponseBase from 'src/shared/interfaces/response-base.interface';
import { SubscriptionStatus } from 'src/subscription/enum/subscription-status.enum';
import { CreateSubscriptionDto } from 'src/subscription/types/dto/create-subscription.dto';
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
    @Cron(CronExpression.EVERY_DAY_AT_3PM)
    private async checkSubscriptions(): Promise<void> {
        const subscriptions = await this.db.Subscription.find({
            nextBillingDate: { $lte: new Date() },
            status: SubscriptionStatus.ACTIVE,
        }).populate('plan');
        const renewings = subscriptions.map((subscription, index) =>
            this.grantMonthlyCredits(
                subscription.user._id,
                subscription._id,
                subscription.plan.monthlyCredits
            )
        );
        await Promise.all(renewings);
    }

    private async grantMonthlyCredits(
        userId: string,
        subscriptionId: string,
        monthlyCredits: number,
        session?: mongoose.mongo.ClientSession
    ): Promise<ResponseBase> {
        // console.log(`userId: ${userId}, monthlyCredits: ${monthlyCredits}`);
        const updateUserDto: UpdateUserDto = {
            creditBalance: monthlyCredits,
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
                amount: monthlyCredits,
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
                _id: subscriptionId,
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
        createSubscriptionDto: CreateSubscriptionDto
    ): Promise<ResponseBase> {
        const activeSubscription = await this.db.Subscription.findOne({
            user: userId,
            status: SubscriptionStatus.ACTIVE,
        });
        if (activeSubscription) {
            return { isSuccess: false, message: 'user already has a subscription' };
        }

        const readSinglePlanResponse = await this.planService.readByName(
            createSubscriptionDto.chosenPlanName
        );
        if (!readSinglePlanResponse.isSuccess || !readSinglePlanResponse.plan) {
            return readSinglePlanResponse;
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
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

            const response = await this.grantMonthlyCredits(
                userId,
                subscription._id,
                readSinglePlanResponse.plan.monthlyCredits,
                session
            );
            if (!response.isSuccess) {
                await session.abortTransaction();
                return response;
            }
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            return {
                isSuccess: false,
                message: `transaction failed, error: ${JSON.stringify(error, null, 2)}`,
            };
        } finally {
            await session.endSession();
        }
        return { isSuccess: true, message: 'subscription created' };
    }

    async cancel(): Promise<ResponseBase> {
        return { isSuccess: true, message: 'subscription canceled' };
    }
}
