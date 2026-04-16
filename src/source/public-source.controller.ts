// eslint-disable-next-line no-redeclare
import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SourceService } from 'src/source/source.service';
import { GetPdfResponse } from 'src/source/types/response/get-pdf.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';

@Controller('public-source')
export class PublicSourceController {
    constructor(private sourceService: SourceService) {}

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
