import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceTypeFactory } from 'src/source/strategies/type/source-type.factory';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import { SourceDocument } from 'src/source/types/source-document.interface';
import { Express } from 'express';

@Injectable()
export class SourceService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Source', Model<SourceDocument>>,
        private sourceTypeFactory: SourceTypeFactory
    ) {}

    async create(userId: string, dto: CreateSourceDto, file?: Express.Multer.File): Promise<ResponseBase> {
        const strategy = this.sourceTypeFactory.resolveStrategy(dto.type);
        const { text, title } = await strategy.extract(dto, file);

        await this.db.Source.create({
            userId,
            type: dto.type,
            title,
            rawText: text,
        });

        return { isSuccess: true, message: 'source created' };
    }

    async readById(id: string): Promise<ReadSingleSourceResponse> {
        const source = await this.db.Source.findOne({ _id: id });

        if (!source) {
            throw new NotFoundException(`source not found by id ${id}`);
        }

        return { isSuccess: true, message: `source read by id ${id}`, source };
    }

    async readAllByUserId(userId: string): Promise<ReadAllSourcesResponse> {
        const sources = await this.db.Source.find({ userId });

        return {
            isSuccess: true,
            message: `all sources read associated by userId: ${userId}`,
            sources,
        };
    }

    async updateById(id: string, dto: UpdateSourceDto): Promise<ResponseBase> {
        const updatedSource = await this.db.Source.findOneAndUpdate(
            { _id: id },
            { $set: dto },
            {
                new: true,
            }
        );

        if (!updatedSource) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source updated' };
    }

    async deleteById(id: string): Promise<ResponseBase> {
        const deletedSource = await this.db.Source.findOneAndDelete({ _id: id });

        if (!deletedSource) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source deleted' };
    }
}
