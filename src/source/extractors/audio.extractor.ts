import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ALLOWED_AUDIO_EXTRACTOR_MIMETYPES } from 'src/source/extractors/constants/allowed-audio-extractor-mimetypes.constant';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { removeEmptyBlockNodes } from 'src/source/extractors/utils/remove-empty-block-nodes.util';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { Express } from 'express';

@Injectable()
export class AudioExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.AUDIO;
    input?: ExtractionInput;

    constructor(private readonly aiService: AiService) {}

    buildInput(dto: CreateSourceDto, file?: Express.Multer.File): SourceContentExtractor {
        if (!file) throw new BadRequestException('File is required for audio source type');

        if (!Object.keys(ALLOWED_AUDIO_EXTRACTOR_MIMETYPES).includes(file.mimetype)) {
            throw new BadRequestException(
                'Unsupported audio format. Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm'
            );
        }

        this.input = { type: SourceType.AUDIO, fileBuffer: file.buffer, mimetype: file.mimetype };

        return this;
    }

    resolveTitle(dto: CreateSourceDto, file?: Express.Multer.File): string {
        return dto.title ?? file?.originalname ?? 'Untitled';
    }

    async extract(): Promise<ExtractionResult> {
        const { fileBuffer, mimetype } = this.input as Extract<ExtractionInput, { type: SourceType.AUDIO }>;
        const text = await this.aiService.transcribeAudio(fileBuffer, mimetype);

        const documentNode = await this.aiService.convertTextIntoSourceTextNode(text);

        documentNode.content = removeEmptyBlockNodes(documentNode.content);

        return { text: JSON.stringify(documentNode) };
    }
}
