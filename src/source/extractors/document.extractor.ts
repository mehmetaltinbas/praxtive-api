import { BadRequestException, Injectable } from '@nestjs/common';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { AiService } from 'src/ai/ai.service';
import { SourceType } from 'src/source/enums/source-type.enum';
import { ExtractionInput } from 'src/source/extractors/types/extraction-input.type';
import { ExtractionResult } from 'src/source/extractors/types/extraction-result.type';
import { PdfjsFontFaceObject } from 'src/source/extractors/types/pdfjs-font-face-object.interface';
import { SourceContentExtractor } from 'src/source/extractors/types/source-content-extractor.interface';
import { mergeInlineNodes } from 'src/source/extractors/utils/merge-inline-nodes.util';
import { removeEmptyBlockNodes } from 'src/source/extractors/utils/remove-empty-block-nodes.util';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { BlockNode } from 'src/source/types/source-text-node/block-node.interface';
import { SourceTextNode } from 'src/source/types/source-text-node/source-text-node.interface';
import type { Express } from 'express';
import { InlineNode } from 'src/source/types/source-text-node/inline-node.interface';
import { mapFontSizeToEnum } from 'src/source/extractors/utils/map-to-font-size-enum.util';

@Injectable()
export class DocumentExtractor implements SourceContentExtractor {
    readonly sourceType = SourceType.DOCUMENT;
    input?: ExtractionInput;

    constructor(private readonly aiService: AiService) {}

    buildInput(dto: CreateSourceDto, file?: Express.Multer.File): SourceContentExtractor {
        if (!file) throw new BadRequestException('File is required for document source type');
        if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are supported');

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

        const sourceTextNode: SourceTextNode = { content: [] };

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
                        fontSize: mapFontSizeToEnum(element.height),
                        bold: marks.bold,
                        italic: marks.italic,
                    },
                };

                if (inlineNode.text.length > 0) {
                    if (inlineNode.text === ' ') {
                        inlineNode.styles.fontSize = mapFontSizeToEnum(element.transform[3] as number);
                    }

                    currentBlock.content.push(inlineNode);
                }

                if (element.hasEOL) {
                    sourceTextNode.content.push({
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
                                        fontSize: mapFontSizeToEnum(
                                            Math.floor(
                                                previousElement.transform[5] - element.transform[5] - element.transform[3]
                                            )
                                        ),
                                        bold: false,
                                        italic: false,
                                    },
                                },
                            ],
                        };

                        sourceTextNode.content.push(lineBreak);
                    }
                }
            });

            if (currentBlock.content.length > 0) {
                sourceTextNode.content.push({
                    content: mergeInlineNodes(currentBlock.content),
                });
            }
        }

        sourceTextNode.content = removeEmptyBlockNodes(sourceTextNode.content);

        return { text: JSON.stringify(sourceTextNode) };
    }
}