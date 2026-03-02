import { BadRequestException, Injectable } from '@nestjs/common';
import { DocxTextExtractor } from './docx-text-extractor.provider';
import { PdfTextExtractor } from './pdf-text-extractor.provider';
import { TextExtractor } from './types/text-extractor.interface';

@Injectable()
export class TextExtractorService {
    private readonly extractorMap: Map<string, TextExtractor>;

    constructor(
        private pdfTextExtractor: PdfTextExtractor,
        private docxTextExtractor: DocxTextExtractor
    ) {
        this.extractorMap = new Map([
            ['application/pdf', this.pdfTextExtractor],
            ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', this.docxTextExtractor],
        ]);
    }

    resolveExtractor(mimetype: string): TextExtractor {
        const strategyInstance = this.extractorMap.get(mimetype);

        if (!strategyInstance) {
            throw new BadRequestException(`Unsupported file type: ${mimetype}`);
        }

        return strategyInstance;
    }
}
