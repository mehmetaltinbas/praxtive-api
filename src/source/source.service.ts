import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import ResponseBase from 'src/shared/types/response-base.interface';
import { SourceTypeFactory } from 'src/source/strategies/type/source-type.factory';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { UpdateSourceDto } from 'src/source/types/dto/update-source.dto';
import { ReadAllSourcesResponse } from 'src/source/types/response/read-all-sources.response';
import { ReadSingleSourceResponse } from 'src/source/types/response/read-single-source.response';
import { SourceDocument } from 'src/source/types/source-document.interface';

@Injectable()
export class SourceService {
    constructor(
        @Inject('DB_MODELS') private db: Record<'Source', mongoose.Model<SourceDocument>>,
        private sourceTypeFactory: SourceTypeFactory
    ) {}

    async create(userId: string, dto: CreateSourceDto, file?: Express.Multer.File): Promise<ResponseBase> {
        const strategy = this.sourceTypeFactory.resolveStrategy(dto.type);
        const { text, title } = await strategy.extract(dto, file);

        const conflict = await this.db.Source.findOne({ userId, title });

        if (conflict) {
            return {
                isSuccess: false,
                message: `A source with the title "${title}" already exists.`,
            };
        }

        await this.db.Source.create({
            userId,
            type: dto.type,
            title,
            rawText: text,
        });

        return { isSuccess: true, message: 'source created' };
    }

    async readById(userId: string, id: string): Promise<ReadSingleSourceResponse> {
        const source = await this.db.Source.findOne({ _id: id, userId });

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

    async updateById(userId: string, id: string, dto: UpdateSourceDto): Promise<ResponseBase> {
        const { title, ...restOfDto } = dto;

        await this.readById(userId, id);

        if (title) {
            const conflict = await this.db.Source.findOne({
                userId,
                title: title,
                _id: { $ne: id }, // exclude the current document from the search
            });

            if (conflict) {
                return {
                    isSuccess: false,
                    message: `A source with the title "${title}" already exists.`,
                };
            }
        }

        const updated = await this.db.Source.findOneAndUpdate(
            { _id: id, userId },
            {
                $set: {
                    ...restOfDto,
                    title,
                },
            },
            {
                new: true,
            }
        );

        if (!updated) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source updated' };
    }

    async deleteById(userId: string, id: string): Promise<ResponseBase> {
        const deletedSource = await this.db.Source.findOneAndDelete({ _id: id, userId });

        if (!deletedSource) {
            throw new NotFoundException('source not found');
        }

        return { isSuccess: true, message: 'source deleted' };
    }
}
