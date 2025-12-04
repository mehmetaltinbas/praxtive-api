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

    async verifyHigher(
        currentPlanName: PlanName,
        higherPlanName: PlanName
    ): Promise<ResponseBase> {
        const verifiedCurrentPlanName = Object.values(PlanName).includes(currentPlanName);
        if (!verifiedCurrentPlanName) {
            return { isSuccess: false, message: "currentPlanName isn't valid" };
        }

        if (currentPlanName === PlanName.FREE) {
            if (higherPlanName === PlanName.PRO || higherPlanName === PlanName.BUSINESS) {
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            } else {
                return {
                    isSuccess: false,
                    message: "higherPlanName isn't actually higher than currentPlan",
                };
            }
        } else if (currentPlanName === PlanName.PRO) {
            if (higherPlanName === PlanName.BUSINESS) {
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            } else {
                return {
                    isSuccess: false,
                    message: "higherPlanName isn't actually higher than currentPlan",
                };
            }
        } else if (currentPlanName === PlanName.BUSINESS) {
            return { isSuccess: false, message: 'currentPlanName is already the highest' };
        }
        return { isSuccess: false, message: "couldn't verified" };
    }
}
