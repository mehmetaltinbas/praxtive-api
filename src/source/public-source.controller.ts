// eslint-disable-next-line no-redeclare
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceService } from 'src/source/source.service';
import { CloneSourceDto } from 'src/source/types/dto/clone-source.dto';
import { GetPdfResponse } from 'src/source/types/response/get-pdf.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';

@Controller('public-source')
export class PublicSourceController {
    constructor(private sourceService: SourceService) {}

    @Post('clone/:sourceId')
    @UseGuards(AuthGuard)
    async clone(
        @User() user: JwtPayload,
        @Param('sourceId') sourceId: string,
        @Body() dto: CloneSourceDto
    ): Promise<ResponseBase> {
        return await this.sourceService.clone(user.sub, sourceId, dto);
    }

    @Get('read-by-id/:sourceId')
    async readPublicById(@Param('sourceId') sourceId: string): Promise<ReadSingleSourceResponse> {
        return await this.sourceService.readById(undefined, sourceId);
    }

    @Get('read-all-by-user-name/:userName')
    async readAllPublicByUserName(@Param('userName') userName: string): Promise<ReadAllSourcesResponse> {
        return await this.sourceService.readAllPublicByUserName(userName);
    }

    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Get('get-pdf/:sourceId')
    async getPdf(@Param('sourceId') sourceId: string): Promise<GetPdfResponse> {
        return await this.sourceService.getPdf(undefined, sourceId);
    }
}
