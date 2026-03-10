import { Module } from '@nestjs/common';
import { AiModule } from 'src/ai/ai.module';
import { SourceController } from 'src/source/source.controller';
import { SourceService } from 'src/source/source.service';
import { AudioExtractor } from './extractors/audio.extractor';
import { DocumentExtractor } from './extractors/document.extractor';
import { RawTextExtractor } from './extractors/raw-text.extractor';
import { SOURCE_CONTENT_EXTRACTORS } from './extractors/source-content-extractor.token';
import { YoutubeVideoExtractor } from './extractors/youtube-video.extractor';

@Module({
    imports: [AiModule],
    providers: [
        SourceService,
        RawTextExtractor,
        DocumentExtractor,
        YoutubeVideoExtractor,
        AudioExtractor,
        {
            provide: SOURCE_CONTENT_EXTRACTORS,
            useFactory: (
                rawText: RawTextExtractor,
                document: DocumentExtractor,
                youtubeVideo: YoutubeVideoExtractor,
                audio: AudioExtractor
            ) => [rawText, document, youtubeVideo, audio],
            inject: [RawTextExtractor, DocumentExtractor, YoutubeVideoExtractor, AudioExtractor],
        },
    ],
    controllers: [SourceController],
    exports: [SourceService],
})
export class SourceModule {}
