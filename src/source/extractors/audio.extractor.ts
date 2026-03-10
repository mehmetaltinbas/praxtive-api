import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { Express } from 'express';

@Injectable()
export class AudioExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.AUDIO;
    input?: ExtractionInput;

    constructor(private readonly aiService: AiService) {}

    buildInput(dto: CreateSourceDto, file?: Express.Multer.File): SourceContentExtractor {
        if (!file) throw new BadRequestException('File is required for audio source type');

        this.input = { type: SourceType.AUDIO, fileBuffer: file.buffer };

        return this;
    }

    resolveTitle(dto: CreateSourceDto, file?: Express.Multer.File): string {
        return dto.title ?? file?.originalname ?? 'Untitled';
    }

    async extract(): Promise<ExtractionResult> {
        const { fileBuffer } = this.input as Extract<ExtractionInput, { type: SourceType.AUDIO }>;
        const text = await this.aiService.transcribeAudio(fileBuffer);

        return { text };
    }
}
