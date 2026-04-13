import { BadRequestException, Injectable } from '@nestjs/common';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { plainTextToTipTap } from 'src/source/utils/plain-text-to-tiptap.util';

@Injectable()
export class RawTextSourceTypeStrategy implements SourceTypeStrategy {
    readonly type = SourceType.RAW_TEXT;

    async extract(dto: CreateSourceDto): Promise<ExtractionResult> {
        if (!dto.title) throw new BadRequestException('Title is required for raw text source type');

        const doc = plainTextToTipTap(dto.rawText!);

        return { title: dto.title, text: JSON.stringify(doc) };
    }
}
