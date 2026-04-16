// eslint-disable-next-line no-redeclare
import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { MAX_PAPER_EVALUATION_UPLOAD_COUNT } from 'src/exercise-set/constants/max-paper-evaluation-upload-count.constant';
import { ExerciseSetService } from 'src/exercise-set/exercise-set.service';
import { CloneExerciseSetDto } from 'src/exercise-set/types/dto/clone-exercise-set.dto';
import { EvaluateAnswersDto } from 'src/exercise-set/types/dto/evaluate-answers.dto';
import { EvaluateAnswersResponse } from 'src/exercise-set/types/response/evaluate-answers.response';
import { GetPdfResponse } from 'src/exercise-set/types/response/get-pdf.response';
import { ReadAllExerciseSetsResponse } from 'src/exercise-set/types/response/read-all-exercise-sets.response';
import { ReadSingleExerciseSetResponse } from 'src/exercise-set/types/response/read-single-exercise-set.response';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';

@Controller('public-exercise-set')
export class PublicExerciseSetController {
    constructor(private exerciseSetService: ExerciseSetService) {}

    @Post('clone/:exerciseSetId')
    @UseGuards(AuthGuard)
    async clone(
        @User() user: JwtPayload,
        @Param('exerciseSetId') exerciseSetId: string,
        @Body() dto: CloneExerciseSetDto
    ): Promise<ResponseBase> {
        return await this.exerciseSetService.clone(user.sub, exerciseSetId, dto);
    }

    @Get('read-by-id/:exerciseSetId')
    async readPublicById(@Param('exerciseSetId') exerciseSetId: string): Promise<ReadSingleExerciseSetResponse> {
        return await this.exerciseSetService.readById(undefined, exerciseSetId);
    }

    @Get('read-all-by-user-name/:userName')
    async readAllPublicByUserName(@Param('userName') userName: string): Promise<ReadAllExerciseSetsResponse> {
        return await this.exerciseSetService.readAllPublicByUserName(userName);
    }

    @Post('evaluate-answers')
    @UseGuards(AuthGuard)
    async evaluatePublicAnswers(
        @User() user: JwtPayload,
        @Body() dto: EvaluateAnswersDto
    ): Promise<EvaluateAnswersResponse> {
        return await this.exerciseSetService.evaluateAnswers(user.sub, dto, true);
    }

    @Get('get-pdf/:exerciseSetId')
    async getPdf(
        @Param('exerciseSetId') exerciseSetId: string,
        @Query('withAnswers') withAnswers?: string
    ): Promise<GetPdfResponse> {
        return await this.exerciseSetService.getPdf(undefined, exerciseSetId, withAnswers === 'true');
    }

    @Post('evaluate-paper-answers/:id')
    @UseGuards(AuthGuard)
    @UseInterceptors(FilesInterceptor('files', MAX_PAPER_EVALUATION_UPLOAD_COUNT))
    async evaluatePublicPaperAnswers(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[]
    ): Promise<EvaluateAnswersResponse> {
        return await this.exerciseSetService.evaluatePaperAnswers(user.sub, id, files, true);
    }
}
