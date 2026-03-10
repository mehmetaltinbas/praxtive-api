// eslint-disable-next-line no-redeclare
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import { EvaluateAnswersResponse } from 'src/exercise-set/types/response/evaluate-answers.response';
import { AuthGuard } from '../auth/auth.guard';
import JwtPayload from '../auth/types/jwt-payload.interface';
import User from '../shared/custom-decorators/user.decorator';
import ResponseBase from '../shared/types/response-base.interface';
import { ExerciseSetService } from './exercise-set.service';
import { CreateExerciseSetDto } from './types/dto/create-exercise-set.dto';
import { ReadAllExerciseSetsGroupedBySourcesResponse } from './types/response/read-all-exercise-sets-grouped-by-sources.response';
import { ReadAllExerciseSetsResponse } from './types/response/read-all-exercise-sets.response';
import { ReadSingleExerciseSetResponse } from './types/response/read-single-exercise-set.response';

@Controller('exercise-set')
@UseGuards(AuthGuard)
export class ExerciseSetController {
    constructor(private exerciseSetService: ExerciseSetService) {}

    @Post('create')
    async createIndependent(@User() user: JwtPayload, @Body() dto: CreateExerciseSetDto): Promise<ResponseBase> {
        const response = await this.exerciseSetService.create(user.sub, undefined, dto);

        return response;
    }

    @Post('create/:sourceId')
    async createBySourceId(
        @User() user: JwtPayload,
        @Param('sourceId') sourceId: string | undefined,
        @Body() createExerciseSetDto: CreateExerciseSetDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseSetService.create(user.sub, sourceId, createExerciseSetDto);

        return response;
    }

    @Get('read-by-id/:id')
    async readById(@Param('id') id: string): Promise<ReadSingleExerciseSetResponse> {
        const response = this.exerciseSetService.readById(id);

        return response;
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(
        @User() user: JwtPayload,
        @Query() readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto
    ): Promise<ReadAllExerciseSetsResponse> {
        const response = await this.exerciseSetService.readAllByUserId(
            user.sub,
            readMultipleExerciseSetsFilterCriteriaDto
        );

        return response;
    }

    @Get('read-all-by-user-id-grouped-by-sources')
    async readAllByUserIdGroupedBySources(
        @User() user: JwtPayload
    ): Promise<ReadAllExerciseSetsGroupedBySourcesResponse> {
        const response = await this.exerciseSetService.readAllByUserIdGroupedBySources(user.sub);

        return response;
    }

    @Patch('update-by-id/:id')
    async updateById(@Param('id') id: string, @Body() dto: UpdateExerciseSetDto): Promise<ResponseBase> {
        const response = await this.exerciseSetService.updateById(id, dto);

        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseSetService.deleteById(id);

        return response;
    }

    @Post('evaluate-answers')
    async evaluateAnswers(@Body() evaluateAnswersDto: EvaluateAnswersDto): Promise<EvaluateAnswersResponse> {
        const response = this.exerciseSetService.evaluateAnswers(evaluateAnswersDto);

        return response;
    }
}
