import {
    // eslint-disable-next-line no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MAX_PAPER_EVALUATION_UPLOAD_COUNT } from 'src/exercise-set/constants/max-paper-evaluation-upload-count.constant';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import { EvaluateAnswersResponse } from 'src/exercise-set/types/response/evaluate-answers.response';
import { GetPdfResponse } from 'src/exercise-set/types/response/get-pdf.response';
import { ReorderExercisesDto } from 'src/exercise/types/dto/reorder-exercises.dto';
import { AuthGuard } from '../auth/auth.guard';
import JwtPayload from '../auth/types/jwt-payload.interface';
import User from '../shared/custom-decorators/user.decorator';
import ResponseBase from '../shared/types/response-base.interface';
import { ExerciseSetService } from './exercise-set.service';
import { CreateExerciseSetDto } from './types/dto/create-exercise-set.dto';
import { GenerateAdditionalExercisesDto } from './types/dto/generate-additional-exercises.dto';
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

    @Post('generate-additional/:exerciseSetId')
    async generateAdditionalExercises(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() dto: GenerateAdditionalExercisesDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseSetService.generateAdditionalExercises(user.sub, exerciseSetId, dto);

        return response;
    }

    @Get('read-by-id/:id')
    async readById(@User() user: JwtPayload, @Param('id') id: string): Promise<ReadSingleExerciseSetResponse> {
        const response = this.exerciseSetService.readById(user.sub, id);

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
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateExerciseSetDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseSetService.updateById(user.sub, id, dto);

        return response;
    }

    @Post('reorder/:id')
    async reorder(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: ReorderExercisesDto
    ): Promise<ResponseBase> {
        const response = await this.exerciseSetService.reorder(user.sub, id, dto);

        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        const response = await this.exerciseSetService.deleteById(user.sub, id);

        return response;
    }

    @Post('evaluate-answers')
    async evaluateAnswers(
        @User() user: JwtPayload,
        @Body() evaluateAnswersDto: EvaluateAnswersDto
    ): Promise<EvaluateAnswersResponse> {
        const response = this.exerciseSetService.evaluateAnswers(user.sub, evaluateAnswersDto);

        return response;
    }

    @Get('get-pdf/:id')
    async getPdf(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Query('withAnswers') withAnswers?: string
    ): Promise<GetPdfResponse> {
        const response = this.exerciseSetService.getPdf(user.sub, id, withAnswers === 'true');

        return response;
    }

    @Post('evaluate-paper-answers/:id')
    @UseInterceptors(FilesInterceptor('files', MAX_PAPER_EVALUATION_UPLOAD_COUNT))
    async evaluatePaperAnswers(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[]
    ): Promise<EvaluateAnswersResponse> {
        const response = await this.exerciseSetService.evaluatePaperAnswers(user.sub, id, files);

        return response;
    }
}
