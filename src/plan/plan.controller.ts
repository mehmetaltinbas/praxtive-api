// eslint-disable-next-line no-redeclare
import { Controller, Get, Param } from '@nestjs/common';
import { PlanName } from 'src/plan/enums/plan-name.enum';
import { PlanService } from 'src/plan/plan.service';
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

    @Get('read-by-name/:planName')
    async readByName(@Param('planName') planName: PlanName): Promise<ReadSinglePlanResponse> {
        console.log(planName);
        const response = await this.planService.readByName(planName);

        return response;
    }
}
