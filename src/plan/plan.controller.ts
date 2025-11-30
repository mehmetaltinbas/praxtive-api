// eslint-disable-next-line no-redeclare
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PlanService } from 'src/plan/plan.service';
import { CreatePlanDto } from 'src/plan/types/dto/create-plan.dto.model';
import { ReadSinglePlanResponse } from 'src/plan/types/response/read-single-plan.response';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

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
    async readByName(@Param('planName') planName: string): Promise<ReadSinglePlanResponse> {
        console.log(planName);
        const response = await this.planService.readByName(planName);
        return response;
    }
}
