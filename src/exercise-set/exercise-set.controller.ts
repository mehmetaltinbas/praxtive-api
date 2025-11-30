// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ExerciseSetService } from './exercise-set.service';
import { AuthGuard } from '../auth/auth.guard';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { CreateExerciseSetDto } from './types/dto/create-exercise-set.dto';
import { ReadAllExerciseSetsResponse } from './types/response/read-all-exercise-sets.response';
import User from '../shared/custom-decorators/user.decorator';
import JwtPayload from '../auth/types/jwt-payload.interface';
import { ReadAllExerciseSetsGroupedBySourcesResponse } from './types/response/read-all-exercise-sets-grouped-by-sources.response';
import { ReadSingleExerciseSetResponse } from './types/response/read-single-exercise-set.response';
import { EvaluateAnswersResponse } from 'src/exercise-set/types/response/evaluate-answers.response';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';

@Controller('exercise-set')
@UseGuards(AuthGuard)
export class ExerciseSetController {
    constructor(private exerciseSetService: ExerciseSetService) {}

    @Post('create/:sourceId')
    async createByExerciseSetId(
        @Param('sourceId') sourceId: string,
        @Body() createExerciseSetDto: CreateExerciseSetDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseSetService.create(sourceId, createExerciseSetDto);
        return response;
    }

    @Get('read-by-id/:id')
    async readById(@Param('id') id: string): Promise<ReadSingleExerciseSetResponse> {
        const response = this.exerciseSetService.readById(id);
        return response;
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(@User() user: JwtPayload): Promise<ReadAllExerciseSetsResponse> {
        const response = await this.exerciseSetService.readAllByUserId(user.sub);
        return response;
    }

    @Get('read-all-by-user-id-grouped-by-sources')
    async readAllByUserIdGroupedBySources(
        @User() user: JwtPayload
    ): Promise<ReadAllExerciseSetsGroupedBySourcesResponse> {
        const response = await this.exerciseSetService.readAllByUserIdGroupedBySources(
            user.sub
        );
        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseSetService.deleteById(id);
        return response;
    }

    @Post('evaluate-answers')
    async evaluateAnswers(
        @Body() evaluateAnswersDto: EvaluateAnswersDto
    ): Promise<EvaluateAnswersResponse> {
        const response = this.exerciseSetService.evaluateAnswers(evaluateAnswersDto);
        return response;
    }
}
