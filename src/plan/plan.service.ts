import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { CreatePlanDto } from 'src/plan/types/dto/create-plan.dto.model';
import { ReadSinglePlanResponse } from 'src/plan/types/response/read-single-plan.response';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

@Injectable()
export class PlanService {
    constructor(@Inject('DB_MODELS') private db: Record<'Plan', Model<PlanDocument>>) {}

    async create(createPlanDto: CreatePlanDto): Promise<ResponseBase> {
        const plan = await this.db.Plan.create(createPlanDto);

        if (!plan) {
            return { isSuccess: false, message: "plan couldn't created" };
        }

        return { isSuccess: true, message: 'plan created' };
    }

    async readByName(planName: PlanName): Promise<ReadSinglePlanResponse> {
        const plan = await this.db.Plan.findOne({
            name: planName,
        });

        if (!plan) {
            return { isSuccess: false, message: "plan couldn't read" };
        }

        return { isSuccess: true, message: 'plan read', plan };
    }

    async validateIsHigher(currentPlanName: PlanName, higherPlanName: PlanName): Promise<ResponseBase> {
        const isCurrentPlanNameValid = Object.values(PlanName).includes(currentPlanName);

        if (!isCurrentPlanNameValid) return { isSuccess: false, message: "currentPlanName isn't valid" };
        const isHigherPlanNameValid = Object.values(PlanName).includes(higherPlanName);

        if (!isHigherPlanNameValid) return { isSuccess: false, message: "higherPlanName isn't valid" };

        if (currentPlanName === PlanName.FREE) {
            if (higherPlanName === PlanName.PRO || higherPlanName === PlanName.BUSINESS)
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            else
                return {
                    isSuccess: false,
                    message: "higherPlanName isn't actually higher than currentPlan",
                };
        } else if (currentPlanName === PlanName.PRO) {
            if (higherPlanName === PlanName.BUSINESS)
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            else
                return {
                    isSuccess: false,
                    message: "higherPlanName isn't actually higher than currentPlan",
                };
        } else if (currentPlanName === PlanName.BUSINESS)
            return { isSuccess: false, message: 'currentPlanName is already the highest' };

        return { isSuccess: false, message: "couldn't verified" };
    }

    async validateIsLower(currentPlanName: PlanName, lowerPlanName: PlanName): Promise<ResponseBase> {
        const isCurrentPlanNameValid = Object.values(PlanName).includes(currentPlanName);

        if (!isCurrentPlanNameValid) return { isSuccess: false, message: "currentPlanName isn't valid" };
        const isHigherPlanNameValid = Object.values(PlanName).includes(lowerPlanName);

        if (!isHigherPlanNameValid) return { isSuccess: false, message: "higherPlanName isn't valid" };

        if (currentPlanName === PlanName.FREE) {
            return { isSuccess: false, message: 'currentPlan is already the lowest plan' };
        } else if (currentPlanName === PlanName.PRO) {
            if (lowerPlanName === PlanName.FREE)
                return {
                    isSuccess: true,
                    message: 'lowerPlanName is actually lower then currentPlanName',
                };
            else
                return {
                    isSuccess: false,
                    message: "lowerPlanName isn't actually lower then currentPlanName",
                };
        } else if (currentPlanName === PlanName.BUSINESS) {
            if (lowerPlanName === PlanName.FREE || lowerPlanName === PlanName.PRO)
                return {
                    isSuccess: true,
                    message: 'lowerPlanName is actually lower then currentPlanName',
                };
            else
                return {
                    isSuccess: false,
                    message: "lowerPlanName isn't actually lower then currentPlanName",
                };
        }

        return { isSuccess: false, message: "couldn't validate" };
    }
}
