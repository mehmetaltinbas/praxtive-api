import { BadRequestException, Injectable } from '@nestjs/common';
import { SourceType } from 'src/source/enums/source-type.enum';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';

@Injectable()
export class RawTextExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.RAW_TEXT;
    input?: ExtractionInput;

    constructor() {}

    buildInput(dto: CreateSourceDto): SourceContentExtractor {
        this.input = { type: SourceType.RAW_TEXT, text: dto.rawText! };

        return this;
    }

    resolveTitle(dto: CreateSourceDto): string {
        if (!dto.title) throw new BadRequestException('Title is required for raw text source type');

        return dto.title;
    }

    async extract(): Promise<ExtractionResult> {
        const { text } = this.input as Extract<ExtractionInput, { type: SourceType.RAW_TEXT }>;

        return { text };
    }
}
