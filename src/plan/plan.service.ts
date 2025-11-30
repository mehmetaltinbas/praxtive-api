import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
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

    async readByName(planName: string): Promise<ReadSinglePlanResponse> {
        const plan = await this.db.Plan.findOne({
            name: planName,
        });
        if (!plan) {
            return { isSuccess: false, message: "plan couldn't read" };
        }
        return { isSuccess: true, message: 'plan read', plan };
    }
}
