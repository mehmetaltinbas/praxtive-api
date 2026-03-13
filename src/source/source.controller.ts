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
import { AuthGuard } from 'src/auth/auth.guard';
import JwtPayload from 'src/auth/types/jwt-payload.interface';
import User from 'src/shared/custom-decorators/user.decorator';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceService } from 'src/source/source.service';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import type { Express } from 'express';

@Controller('source')
@UseGuards(AuthGuard)
export class SourceController {
    constructor(private sourceService: SourceService) {}

    @Post('create')
    @UseInterceptors(FileInterceptor('file'))
    async create(
        @User() user: JwtPayload,
        @Body() createSourceDto: CreateSourceDto,
        @UploadedFile() file?: Express.Multer.File
    ): Promise<ResponseBase> {
        const response = await this.sourceService.create(user.sub, createSourceDto, file);

        return response;
    }

    @Get('read-by-id/:id')
    async readById(@User() user: JwtPayload, @Param('id') id: string): Promise<ReadSingleSourceResponse> {
        const response = await this.sourceService.readById(user.sub, id);

        return response;
    }

    @Get('read-all-by-user-id')
    async readAllByUserId(@User() user: JwtPayload): Promise<ReadAllSourcesResponse> {
        const response = await this.sourceService.readAllByUserId(user.sub);

        return response;
    }

    @Patch('update-by-id/:id')
    async updateById(
        @User() user: JwtPayload,
        @Param('id') id: string,
        @Body() updateSourceDto: UpdateSourceDto
    ): Promise<ResponseBase> {
        const response = await this.sourceService.updateById(user.sub, id, updateSourceDto);

        return response;
    }

    @Delete('delete-by-id/:id')
    async deleteById(@User() user: JwtPayload, @Param('id') id: string): Promise<ResponseBase> {
        const response = await this.sourceService.deleteById(user.sub, id);

        return response;
    }
}
