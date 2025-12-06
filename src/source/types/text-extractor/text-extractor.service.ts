import { Injectable } from '@nestjs/common';
import { TextExtractor } from './types/text-extractor.interface';
import { PdfTextExtractor } from './pdf-text-extractor.provider';
import { DocxTextExtractor } from './docx-text-extractor.provider';

@Injectable()
export class TextExtractorService {
    private readonly extractorMap: Map<string, TextExtractor>;

    constructor(
        private pdfTextExtractor: PdfTextExtractor,
        private docxTextExtractor: DocxTextExtractor
    ) {
        this.extractorMap = new Map([
            ['application/pdf', this.pdfTextExtractor],
            [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                this.docxTextExtractor,
            ],
        ]);
    }

    // Factory Pattern
    resolveExtractor(mimetype: string): TextExtractor {
        const strategyInstance = this.extractorMap.get(mimetype);
        if (!strategyInstance) {
            throw new Error(`No strategy for mimetype: ${mimetype}`);
        }
        return strategyInstance;
    }
}
