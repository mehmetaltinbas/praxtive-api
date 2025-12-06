import { Injectable } from '@nestjs/common';
import { TextExtractor } from './types/text-extractor.interface';
import mammoth from 'mammoth';

@Injectable()
export class DocxTextExtractor implements TextExtractor {
    async extractText(fileBuffer: Buffer): Promise<string> {
        const extractedText = await mammoth.extractRawText({ buffer: fileBuffer });
        return extractedText.value;
    }
}
