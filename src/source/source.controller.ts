import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Inject, // eslint-disable-next-line no-redeclare
    Body,
    Param,
    HttpCode,
    UseGuards,
    Req,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { SourceService } from './source.service';
import { UpdateSourceDto } from './types/dto/update-source.dto';
import ResponseBase from '../shared/interfaces/response-base.interface';
import { AuthGuard } from '../auth/auth.guard';
import JwtPayload from '../auth/types/jwt-payload.interface';
import User from '../shared/custom-decorators/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';

@Controller('source')
@UseGuards(AuthGuard)
export class SourceController {
    constructor(private sourceService: SourceService) {}

    @Post('create')
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @User() user: JwtPayload,
        @Body() createSourceDto: CreateSourceDto,
        @UploadedFile() file: Express.Multer.File
    ): Promise<ResponseBase> {
        const response = await this.sourceService.create(user.sub, createSourceDto, file);
        return response;
    }

    @Get('read-by-id/:id')
    async readById(@Param('id') id: string): Promise<ReadSingleSourceResponse> {
        const response = await this.sourceService.readById(id);
        return response;
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(@User() user: JwtPayload): Promise<ReadAllSourcesResponse> {
        const response = await this.sourceService.readAllByUserId(user.sub);
        return response;
    }

    @Patch('update-by-id/:id')
    async updateById(
        @Param('id') id: string,
        @Body() updateSourceDto: UpdateSourceDto
    ): Promise<ResponseBase> {
        const response = await this.sourceService.updateById(id, updateSourceDto);
        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@Param('id') id: string): Promise<ResponseBase> {
        const response = await this.sourceService.deleteById(id);
        return response;
    }
}
