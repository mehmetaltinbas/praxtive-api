import {
    BadRequestException,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { PlanDocument } from 'src/billing/types/plan-document.interface';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { CreatePlanDto } from 'src/plan/types/dto/create-plan.dto.model';
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
        const isCurrentPlanNameValid = Object.values(PlanName).includes(currentPlanName);

        if (!isCurrentPlanNameValid) throw new BadRequestException("currentPlanName isn't valid");
        const isHigherPlanNameValid = Object.values(PlanName).includes(higherPlanName);

        if (!isHigherPlanNameValid) throw new BadRequestException("higherPlanName isn't valid");

        if (currentPlanName === PlanName.FREE) {
            if (higherPlanName === PlanName.PRO || higherPlanName === PlanName.BUSINESS)
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            else throw new BadRequestException("higherPlanName isn't actually higher than currentPlan");
        } else if (currentPlanName === PlanName.PRO) {
            if (higherPlanName === PlanName.BUSINESS)
                return {
                    isSuccess: true,
                    message: 'higherPlanName is actually higher than currentPlan',
                };
            else throw new BadRequestException("higherPlanName isn't actually higher than currentPlan");
        } else if (currentPlanName === PlanName.BUSINESS)
            throw new BadRequestException('currentPlanName is already the highest');

        throw new BadRequestException("couldn't verify plan hierarchy");
    }

    async validateIsLower(currentPlanName: PlanName, lowerPlanName: PlanName): Promise<ResponseBase> {
        const isCurrentPlanNameValid = Object.values(PlanName).includes(currentPlanName);

        if (!isCurrentPlanNameValid) throw new BadRequestException("currentPlanName isn't valid");
        const isHigherPlanNameValid = Object.values(PlanName).includes(lowerPlanName);

        if (!isHigherPlanNameValid) throw new BadRequestException("lowerPlanName isn't valid");

        if (currentPlanName === PlanName.FREE) {
            throw new BadRequestException('currentPlan is already the lowest plan');
        } else if (currentPlanName === PlanName.PRO) {
            if (lowerPlanName === PlanName.FREE)
                return {
                    isSuccess: true,
                    message: 'lowerPlanName is actually lower then currentPlanName',
                };
            else throw new BadRequestException("lowerPlanName isn't actually lower then currentPlanName");
        } else if (currentPlanName === PlanName.BUSINESS) {
            if (lowerPlanName === PlanName.FREE || lowerPlanName === PlanName.PRO)
                return {
                    isSuccess: true,
                    message: 'lowerPlanName is actually lower then currentPlanName',
                };
            else throw new BadRequestException("lowerPlanName isn't actually lower then currentPlanName");
        }

        throw new BadRequestException("couldn't validate plan hierarchy");
    }
}
