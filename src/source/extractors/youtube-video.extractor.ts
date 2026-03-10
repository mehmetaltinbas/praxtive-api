import { Injectable } from '@nestjs/common';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { YoutubeTranscript } from 'youtube-transcript';
import { Express } from 'express';

@Injectable()
export class YoutubeVideoExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.YOUTUBE_VIDEO;
    input?: ExtractionInput;

    constructor() {}

    buildInput(dto: CreateSourceDto): SourceContentExtractor {
        this.input = { type: SourceType.YOUTUBE_VIDEO, url: dto.url! };

        return this;
    }

    resolveTitle(dto: CreateSourceDto, _file?: Express.Multer.File, result?: ExtractionResult): string {
        return dto.title ?? result?.title ?? 'Untitled';
    }

    async extract(): Promise<ExtractionResult> {
        const { url } = this.input as Extract<ExtractionInput, { type: SourceType.YOUTUBE_VIDEO }>;
        const transcriptItems = await YoutubeTranscript.fetchTranscript(url);
        const text = transcriptItems.map((item) => item.text).join(' ');

        return { text };
    }
}
