import { Controller, Get, Param } from '@nestjs/common';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { PlanService } from 'src/plan/plan.service';
import { ReadAllPlansResponse } from 'src/plan/types/response/read-all-plans.response';
import { ReadSinglePlanResponse } from 'src/plan/types/response/read-single-plan.response';

@Controller('plan')
export class PlanController {
    constructor(private planService: PlanService) {}

    // @Post('create')
    // async create(@Body() createPlanDto: CreatePlanDto): Promise<ResponseBase> {
    //     console.log(createPlanDto);
    //     const response = await this.planService.create(createPlanDto);
    //     return response;
    // }

    @Get('read-all')
    async readAll(): Promise<ReadAllPlansResponse> {
        return await this.planService.readAll();
    }

    @Get('read-by-name/:planName')
    async readByName(@Param('planName') planName: PlanName): Promise<ReadSinglePlanResponse> {
        return await this.planService.readByName(planName);
    }
}
