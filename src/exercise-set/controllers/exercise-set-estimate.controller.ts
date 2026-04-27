// eslint-disable-next-line no-redeclare
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { CreditEstimateResponse } from 'src/credit-transaction/types/response/credit-estimate.response';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { CreateExerciseSetDto } from 'src/exercise-set/types/dto/create-exercise-set.dto';
import { EstimateEvaluatePaperAnswersDto } from 'src/exercise-set/types/dto/estimate-evaluate-paper-answers.dto';
import { GenerateAdditionalExercisesDto } from 'src/exercise-set/types/dto/generate-additional-exercises.dto';
import User from 'src/shared/custom-decorators/user.decorator';

@Controller('exercise-set-estimate')
@UseGuards(AuthGuard)
export class ExerciseSetEstimateController {
    constructor(private exerciseSetService: ExerciseSetService) {}

    @Post('estimate/:contextId')
    async estimateCreate(
        @User() user: JwtPayload,
        @Param('contextId') contextId: string,
        @Body() dto: CreateExerciseSetDto
    ): Promise<CreditEstimateResponse> {
        return this.exerciseSetService.estimateCreate(user.sub, contextId, dto);
    }

    @Post('estimate-additional/:exerciseSetId')
    async estimateAdditional(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() dto: GenerateAdditionalExercisesDto
    ): Promise<CreditEstimateResponse> {
        return this.exerciseSetService.estimateAdditional(user.sub, exerciseSetId, dto);
    }

    @Post('estimate-evaluate-paper-answers/:id')
    async estimateEvaluatePaperAnswers(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: EstimateEvaluatePaperAnswersDto
    ): Promise<CreditEstimateResponse> {
        return this.exerciseSetService.estimatePaperVision(user.sub, id, dto);
    }

    @Post('estimate-generate-notes/:exerciseSetId')
    async estimateGenerateNotes(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string
    ): Promise<CreditEstimateResponse> {
        return this.exerciseSetService.estimateLectureNotes(user.sub, exerciseSetId);
    }
}
