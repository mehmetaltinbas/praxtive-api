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
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { MAX_PAPER_EVALUATION_UPLOAD_COUNT } from 'src/exercise-set/constants/max-paper-evaluation-upload-count.constant';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { ChangeExerciseSetContextDto } from 'src/exercise-set/types/dto/change-exercise-set-context.dto';
import { CreateExerciseSetDto } from 'src/exercise-set/types/dto/create-exercise-set.dto';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { GenerateAdditionalExercisesDto } from 'src/exercise-set/types/dto/generate-additional-exercises.dto';
import { ReadMultipleExerciseSetsFilterCriteriaDto } from 'src/exercise-set/types/dto/read-multiple-exercise-sets-filter-criteria-dto.dto';
import { SaveGeneratedNotesDto } from 'src/exercise-set/types/dto/save-generated-notes.dto';
import { UpdateExerciseSetDto } from 'src/exercise-set/types/dto/update-exercise-set.dto';
import { EvaluateAnswersResponse } from 'src/exercise-set/types/response/evaluate-answers.response';
import { GenerateNotesResponse } from 'src/exercise-set/types/response/generate-notes.response';
import { GetPdfResponse } from 'src/exercise-set/types/response/get-pdf.response';
import { ReadAllExerciseSetsGroupedBySourcesResponse } from 'src/exercise-set/types/response/read-all-exercise-sets-grouped-by-sources.response';
import { ReadAllExerciseSetsResponse } from 'src/exercise-set/types/response/read-all-exercise-sets.response';
import { ReadSingleExerciseSetResponse } from 'src/exercise-set/types/response/read-single-exercise-set.response';
import { ReorderExercisesDto } from 'src/exercise/types/dto/reorder-exercises.dto';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('exercise-set')
@UseGuards(AuthGuard)
export class ExerciseSetController {
    constructor(private exerciseSetService: ExerciseSetService) {}

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('create')
    async createIndependent(@User() user: JwtPayload, @Body() dto: CreateExerciseSetDto): Promise<ResponseBase> {
        return await this.exerciseSetService.create(user.sub, undefined, dto);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('create/:contextId')
    async createByContextId(
        @User() user: JwtPayload,
        @Param('contextId') contextId: string | undefined,
        @Body() dto: CreateExerciseSetDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.create(user.sub, contextId, dto);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('generate-additional/:exerciseSetId')
    async generateAdditionalExercises(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() dto: GenerateAdditionalExercisesDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.generateAdditionalExercises(user.sub, exerciseSetId, dto);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('generate-notes/:exerciseSetId')
    async generateLectureNotes(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string
    ): Promise<GenerateNotesResponse> {
        return this.exerciseSetService.generateLectureNotes(user.sub, exerciseSetId);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('save-generated-notes/:exerciseSetId')
    async saveGeneratedNotes(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() dto: SaveGeneratedNotesDto
    ): Promise<ResponseBase> {
        return this.exerciseSetService.saveGeneratedNotes(user.sub, exerciseSetId, dto);
    }

    @Get('read-by-id/:id')
    async readById(@User() user: JwtPayload, @Param('id') id: string): Promise<ReadSingleExerciseSetResponse> {
        return await this.exerciseSetService.readById(user.sub, id);
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(
        @User() user: JwtPayload,
        @Query() readMultipleExerciseSetsFilterCriteriaDto: ReadMultipleExerciseSetsFilterCriteriaDto
    ): Promise<ReadAllExerciseSetsResponse> {
        return await this.exerciseSetService.readAllByUserId(user.sub, readMultipleExerciseSetsFilterCriteriaDto);
    }

    @Get('read-all-by-user-id-grouped-by-sources')
    async readAllByUserIdGroupedBySources(
        @User() user: JwtPayload
    ): Promise<ReadAllExerciseSetsGroupedBySourcesResponse> {
        return await this.exerciseSetService.readAllByUserIdGroupedBySources(user.sub);
    }

    @Patch('update-by-id/:id')
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateExerciseSetDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.updateById(user.sub, id, dto);
    }

    @Patch('change-context/:id')
    async changeContext(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: ChangeExerciseSetContextDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.changeContext(user.sub, id, dto);
    }

    @Post('reorder/:id')
    async reorder(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: ReorderExercisesDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.reorder(user.sub, id, dto);
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        return await this.exerciseSetService.deleteById(user.sub, id);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('evaluate-answers')
    async evaluateAnswers(
        @User() user: JwtPayload,
        @Body() evaluateAnswersDto: EvaluateAnswersDto
    ): Promise<EvaluateAnswersResponse> {
        return await this.exerciseSetService.evaluateAnswers(user.sub, evaluateAnswersDto);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Get('get-pdf/:id')
    async getPdf(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Query('withAnswers') withAnswers?: string
    ): Promise<GetPdfResponse> {
        return await this.exerciseSetService.getPdf(user.sub, id, withAnswers === 'true');
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('evaluate-paper-answers/:id')
    @UseInterceptors(FilesInterceptor('files', MAX_PAPER_EVALUATION_UPLOAD_COUNT))
    async evaluatePaperAnswers(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[]
    ): Promise<EvaluateAnswersResponse> {
        return await this.exerciseSetService.evaluatePaperAnswers(user.sub, id, files);
    }
}
