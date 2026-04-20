import { Module } from '@nestjs/common';
import { PlanService } from 'src/plan/plan.service';
import { PlanController } from 'src/plan/plan.controller';

@Module({
    controllers: [PlanController],
    providers: [PlanService],
    exports: [PlanService],
})
export class PlanModule {}
