import {
    // eslint-disable-next-line no-redeclare
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import { CreditEstimationService } from 'src/credit-transaction/services/credit-estimation.service';
import { CreditEstimateResponse } from 'src/credit-transaction/types/response/credit-estimate.response';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceService } from 'src/source/source.service';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import { GetPdfResponse } from 'src/source/types/response/get-pdf.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';

@Controller('source')
@UseGuards(AuthGuard)
export class SourceController {
    constructor(
        private sourceService: SourceService,
        private costEstimationService: CreditEstimationService
    ) {}

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Post('create')
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @User() user: JwtPayload,
        @Body() createSourceDto: CreateSourceDto,
        @UploadedFile() file?: Express.Multer.File
    ): Promise<ResponseBase> {
        return await this.sourceService.create(user.sub, createSourceDto, file);
    }

    @Get('read-by-id/:id')
    async readById(@User() user: JwtPayload, @Param('id') id: string): Promise<ReadSingleSourceResponse> {
        return await this.sourceService.readById(user.sub, id);
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(@User() user: JwtPayload): Promise<ReadAllSourcesResponse> {
        return await this.sourceService.readAllByUserId(user.sub);
    }

    @Patch('update-by-id/:id')
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() updateSourceDto: UpdateSourceDto
    ): Promise<ResponseBase> {
        return await this.sourceService.updateById(user.sub, id, updateSourceDto);
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        return await this.sourceService.deleteById(user.sub, id);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Get('get-pdf/:id')
    async getPdf(@User() user: JwtPayload, @Param('id') id: string): Promise<GetPdfResponse> {
        return await this.sourceService.getPdf(user.sub, id);
    }

    @Post('estimate')
    async estimate(@Body() dto: CreateSourceDto): Promise<CreditEstimateResponse> {
        if (dto.type === SourceType.AUDIO && dto.durationSeconds) {
            return this.costEstimationService.estimateAudioTranscription(dto.durationSeconds);
        }

        return { isSuccess: true, message: 'No cost for this source type.', credits: 0, breakdown: {} };
    }
}
