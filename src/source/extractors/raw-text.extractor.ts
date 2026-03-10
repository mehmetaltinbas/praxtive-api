import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { removeEmptyBlockNodes } from 'src/source/extractors/utils/remove-empty-block-nodes.util';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';

@Injectable()
export class RawTextExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.RAW_TEXT;
    input?: ExtractionInput;

    constructor(private readonly aiService: AiService) {}

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

        const sourceTextNode = await this.aiService.convertTextIntoSourceTextNode(text);

        sourceTextNode.content = removeEmptyBlockNodes(sourceTextNode.content);

        return { text: JSON.stringify(sourceTextNode) };
    }
}
