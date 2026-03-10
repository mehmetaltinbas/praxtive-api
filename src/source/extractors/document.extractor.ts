import { BadRequestException, Injectable } from '@nestjs/common';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { BlockNode } from 'src/source/types/block-node.interface';
import { DocumentNode } from 'src/source/types/document-node.interface';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { InlineNode } from 'src/source/types/inline-node.interface';
import { Express } from 'express';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { PdfjsFontFaceObject } from 'src/source/extractors/types/pdfjs-font-face-object.interface';
import { mergeInlineNodes } from 'src/source/extractors/utils/merge-inline-nodes.util';

@Injectable()
export class DocumentExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.DOCUMENT;
    input?: ExtractionInput;

    constructor() {}

    buildInput(dto: CreateSourceDto, file?: Express.Multer.File): SourceContentExtractor {
        if (!file) throw new BadRequestException('File is required for document source type');

        this.input = { type: SourceType.DOCUMENT, fileBuffer: file.buffer };

        return this;
    }

    resolveTitle(dto: CreateSourceDto, file?: Express.Multer.File): string {
        return dto.title ?? file?.originalname ?? 'Untitled';
    }

    async extract(): Promise<ExtractionResult> {
        const { fileBuffer } = this.input as Extract<ExtractionInput, { type: SourceType.DOCUMENT }>;

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(fileBuffer) }).promise;

        const documentNode: DocumentNode = { content: [] };

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            await page.getOperatorList();

            let currentBlock: BlockNode = { content: [] };

            textContent.items.forEach((item: TextItem | TextMarkedContent, index) => {
                const element = item as TextItem;
                const font = page.commonObjs.get(element.fontName) as PdfjsFontFaceObject;
                const name = font?.name?.toLowerCase() ?? '';
                const marks = {
                    bold: name.includes('bold'),
                    italic: name.includes('italic') || name.includes('oblique'),
                };

                const inlineNode: InlineNode = {
                    text: element.str,
                    styles: {
                        fontSize: element.height,
                        bold: marks.bold,
                        italic: marks.italic,
                    },
                };

                if (inlineNode.text.length > 0) {
                    if (inlineNode.text === ' ') {
                        inlineNode.styles.fontSize = element.transform[3] as number;
                    }

                    currentBlock.content.push(inlineNode);
                }

                if (element.hasEOL) {
                    documentNode.content.push({
                        content: mergeInlineNodes(currentBlock.content),
                    });
                    currentBlock = { content: [] };
                }

                if (index > 0) {
                    const previousElement = textContent.items[index - 1] as TextItem;

                    if (element.hasEOL && previousElement.transform[5] !== element.transform[5]) {
                        const lineBreak: BlockNode = {
                            content: [
                                {
                                    text: ` `,
                                    styles: {
                                        fontSize: Math.floor(
                                            previousElement.transform[5] - element.transform[5] - element.transform[3]
                                        ),
                                        bold: false,
                                        italic: false,
                                    },
                                },
                            ],
                        };

                        documentNode.content.push(lineBreak);
                    }
                }
            });

            if (currentBlock.content.length > 0) {
                documentNode.content.push({
                    content: mergeInlineNodes(currentBlock.content),
                });
            }
        }

        return { text: JSON.stringify(documentNode) };
    }
}
