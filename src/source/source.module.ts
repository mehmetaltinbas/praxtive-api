import { Module } from '@nestjs/common';
import { OpenaiModule } from '../openai/openai.module';
import { ProcessedSourceModule } from '../processed-source/processed-source.module';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { TextExtractorModule } from 'src/source/types/text-extractor/text-extractor.module';

@Module({
    imports: [TextExtractorModule, OpenaiModule, ProcessedSourceModule],
    providers: [SourceService],
    controllers: [SourceController],
    exports: [SourceService],
})
export class SourceModule {}
