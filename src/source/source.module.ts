import { Module } from '@nestjs/common';
import { SourceController } from 'src/source/source.controller';
import { SourceService } from 'src/source/source.service';
import { TextExtractorModule } from 'src/source/types/text-extractor/text-extractor.module';

@Module({
    imports: [TextExtractorModule],
    providers: [SourceService],
    controllers: [SourceController],
    exports: [SourceService],
})
export class SourceModule {}
