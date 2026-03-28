import { BadRequestException, Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { ALLOWED_AUDIO_EXTRACTOR_MIMETYPES } from 'src/source/constants/allowed-audio-extractor-mimetypes.constant';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { removeEmptyBlockNodes } from 'src/source/strategies/type/utils/remove-empty-block-nodes.util';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';

@Injectable()
export class AudioSourceTypeStrategy implements SourceTypeStrategy {
    readonly type = SourceType.AUDIO;

    constructor(private readonly aiService: AiService) {}

    async extract(dto: CreateSourceDto, file?: Express.Multer.File): Promise<ExtractionResult> {
        if (!file) throw new BadRequestException('File is required for audio source type');

        if (!Object.keys(ALLOWED_AUDIO_EXTRACTOR_MIMETYPES).includes(file.mimetype)) {
            throw new BadRequestException(
                'Unsupported audio format. Supported formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm'
            );
        }

        const fileBuffer = file.buffer;
        const mimetype = file.mimetype;

        const text = await this.aiService.transcribeAudio(fileBuffer, mimetype);

        const documentNode = await this.aiService.convertTextIntoSourceTextNode(text);

        documentNode.content = removeEmptyBlockNodes(documentNode.content);

        return { title: dto.title ?? file?.originalname ?? 'Untitled', text: JSON.stringify(documentNode) };
    }
}
