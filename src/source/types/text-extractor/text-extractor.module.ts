import { Module } from '@nestjs/common';
import { PdfTextExtractor } from './pdf-text-extractor.provider';
import { TextExtractorService } from './text-extractor.service';
import { DocxTextExtractor } from './docx-text-extractor.provider';

@Module({
    providers: [TextExtractorService, PdfTextExtractor, DocxTextExtractor],
    exports: [TextExtractorService],
})
export class TextExtractorModule {}
