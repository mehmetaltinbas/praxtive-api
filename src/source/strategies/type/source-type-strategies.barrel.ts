import { Type } from '@nestjs/common';
import { AudioSourceTypeStrategy } from 'src/source/strategies/type/implementations/audio-source-type.strategy';
import { DocumentSourceTypeStrategy } from 'src/source/strategies/type/implementations/document-source-type.strategy';
import { RawTextSourceTypeStrategy } from 'src/source/strategies/type/implementations/raw-text-source-type.strategy';
import { YoutubeVideoSourceTypeStrategy } from 'src/source/strategies/type/implementations/youtube-video-source-type.strategy';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';

export const SourceTypeStrategiesBarrel: Type<SourceTypeStrategy>[] = [
    RawTextSourceTypeStrategy,
    DocumentSourceTypeStrategy,
    YoutubeVideoSourceTypeStrategy,
    AudioSourceTypeStrategy,
];
