import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Express } from 'express';
import { TextExtractorService } from 'src/source/types/text-extractor/text-extractor.service';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { SourceDocument } from 'src/source/types/source-document.interface';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import ResponseBase from 'src/shared/interfaces/response-base.interface';

@Injectable()
export class SourceService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Source', Model<SourceDocument>>,
        private textExtractorService: TextExtractorService
    ) {}

    async create(userId: string, dto: CreateSourceDto, file: Express.Multer.File): Promise<ResponseBase> {
        const textExtractor = this.textExtractorService.resolveExtractor(file.mimetype);
        const extractedText = await textExtractor.extractText(file.buffer);

        await this.db.Source.create({
            userId,
            type: 'document', // later text and youtubeUrl should be added using a pattern
            title: dto.title ? dto.title : file.originalname,
            rawText: extractedText,
        });

        return { isSuccess: true, message: 'source created' };
    }

    async readById(id: string): Promise<ReadSingleSourceResponse> {
        const source = await this.db.Source.findOne({ _id: id });

        if (!source) {
            return { isSuccess: false, message: "source couldn't read" };
        }

        return { isSuccess: true, message: `source read by id ${id}`, source };
    }

    async readAllByUserId(userId: string): Promise<ReadAllSourcesResponse> {
        const sources = await this.db.Source.find({ userId });

        if (sources.length === 0) {
            return { isSuccess: false, message: 'no source found' };
        }

        return {
            isSuccess: true,
            message: `all sources read associated by userId: ${userId}`,
            sources,
        };
    }

    async updateById(id: string, dto: UpdateSourceDto): Promise<ResponseBase> {
        const updatedSource = await this.db.Source.findOneAndUpdate({ _id: id }, dto, {
            new: true,
        });

        if (!updatedSource) {
            return { isSuccess: false, message: 'source not found' };
        }

        return { isSuccess: true, message: 'source updated' };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const deletedSource = await this.db.Source.findOneAndDelete({ _id: id });

        if (!deletedSource) {
            return { isSuccess: false, message: 'source not found' };
        }

        return { isSuccess: true, message: 'source deleted' };
    }
}
