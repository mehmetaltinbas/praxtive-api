import {
    BadRequestException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { PLAN_TIER_RANK } from 'src/plan/constants/plan-tier-rank.constant';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { CreatePlanDto } from 'src/plan/types/dto/create-plan.dto.model';
import { PlanDocument } from 'src/plan/types/plan-document.interface';
import { ReadAllPlansResponse } from 'src/plan/types/response/read-all-plans.response';
import { ReadSinglePlanResponse } from 'src/plan/types/response/read-single-plan.response';
import ResponseBase from 'src/shared/types/response-base.interface';

@Injectable()
export class PlanService {
    constructor(@Inject('DB_MODELS') private db: Record<'Plan', mongoose.Model<PlanDocument>>) {}

    async create(createPlanDto: CreatePlanDto): Promise<ResponseBase> {
        const plan = await this.db.Plan.create(createPlanDto);

        if (!plan) {
            throw new InternalServerErrorException("plan couldn't be created");
        }

        return { isSuccess: true, message: 'plan created' };
    }

    async readAll(): Promise<ReadAllPlansResponse> {
        const plans = await this.db.Plan.find();

        return { isSuccess: true, message: 'plans read', plans };
    }

    async readByName(planName: PlanName): Promise<ReadSinglePlanResponse> {
        const plan = await this.db.Plan.findOne({
            name: planName,
        });

        if (!plan) {
            throw new NotFoundException(`plan not found: ${planName}`);
        }

        return { isSuccess: true, message: 'plan read', plan };
    }

    async validateIsHigher(currentPlanName: PlanName, higherPlanName: PlanName): Promise<ResponseBase> {
        this.validatePlanName(currentPlanName);
        this.validatePlanName(higherPlanName);

        if (PLAN_TIER_RANK[higherPlanName] <= PLAN_TIER_RANK[currentPlanName]) {
            throw new BadRequestException("higherPlanName isn't actually higher than currentPlan");
        }

        return { isSuccess: true, message: 'higherPlanName is actually higher than currentPlan' };
    }

    async validateIsLower(currentPlanName: PlanName, lowerPlanName: PlanName): Promise<ResponseBase> {
        this.validatePlanName(currentPlanName);
        this.validatePlanName(lowerPlanName);

        if (PLAN_TIER_RANK[lowerPlanName] >= PLAN_TIER_RANK[currentPlanName]) {
            throw new BadRequestException("lowerPlanName isn't actually lower than currentPlanName");
        }

        return { isSuccess: true, message: 'lowerPlanName is actually lower than currentPlanName' };
    }

    private validatePlanName(planName: PlanName): void {
        if (!Object.values(PlanName).includes(planName)) {
            throw new BadRequestException(`plan name isn't valid: ${planName}`);
        }
    }
}
