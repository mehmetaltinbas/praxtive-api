import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { removeEmptyBlockNodes } from 'src/source/strategies/type/utils/remove-empty-block-nodes.util';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';

@Injectable()
export class RawTextSourceTypeStrategy implements SourceTypeStrategy {
    readonly type = SourceType.RAW_TEXT;

    constructor(private readonly aiService: AiService) {}

    async extract(dto: CreateSourceDto): Promise<ExtractionResult> {
        if (!dto.title) throw new BadRequestException('Title is required for raw text source type');

        const sourceTextNode = await this.aiService.convertTextIntoSourceTextNode(dto.rawText!);

        sourceTextNode.content = removeEmptyBlockNodes(sourceTextNode.content);

        return { title: dto.title, text: JSON.stringify(sourceTextNode) };
    }
}
