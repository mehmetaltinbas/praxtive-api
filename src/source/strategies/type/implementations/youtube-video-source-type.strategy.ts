import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';

@Injectable()
export class YoutubeVideoSourceTypeStrategy implements SourceTypeStrategy {
    readonly type = SourceType.YOUTUBE_VIDEO;

    constructor(private readonly aiService: AiService) {}

    async extract(dto: CreateSourceDto): Promise<ExtractionResult> {
        const url = dto.url!;

        // send request to an enternal python fastapi application
        throw new Error('Not implemented');
    }
}
