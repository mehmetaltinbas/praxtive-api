import { Injectable } from '@nestjs/common';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { AiService } from 'src/ai/ai.service';
import type { Express } from 'express';

@Injectable()
export class YoutubeVideoExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.YOUTUBE_VIDEO;
    input?: ExtractionInput;

    constructor(private readonly aiService: AiService) {}

    buildInput(dto: CreateSourceDto): SourceContentExtractor {
        this.input = { type: SourceType.YOUTUBE_VIDEO, url: dto.url! };

        return this;
    }

    resolveTitle(dto: CreateSourceDto, _file?: Express.Multer.File, result?: ExtractionResult): string {
        return dto.title ?? result?.title ?? 'Untitled';
    }

    async extract(): Promise<ExtractionResult> {
        // send request to an enternal python fastapi application
        throw new Error('Not implemented');
    }
}
