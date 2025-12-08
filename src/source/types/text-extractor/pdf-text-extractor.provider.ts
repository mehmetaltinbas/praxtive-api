import { Injectable } from '@nestjs/common';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { PdfjsFontFaceObject } from 'src/source/types/text-extractor/types/pdfjs-font-face-object.interface';
import { TextExtractor } from 'src/source/types/text-extractor/types/text-extractor.interface';
import { BlockNode } from 'src/source/types/block-node.interface';
import { DocumentNode } from 'src/source/types/document-node.interface';
import { InlineNode } from 'src/source/types/inline-node.interface';

@Injectable()
export class PdfTextExtractor implements TextExtractor {
    async extractText(fileBuffer: Buffer): Promise<string> {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(fileBuffer) })
            .promise;

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
                    // new block if hasEOL
                    documentNode.content.push(currentBlock);
                    currentBlock = { content: [] };
                }

                if (index > 0) {
                    const previousElement = textContent.items[index - 1] as TextItem;
                    if (
                        element.hasEOL &&
                        previousElement.transform[5] !== element.transform[5]
                    ) {
                        // line break construction
                        const lineBreak: BlockNode = {
                            content: [
                                {
                                    text: ` `,
                                    styles: {
                                        fontSize: Math.floor(
                                            previousElement.transform[5] -
                                                element.transform[5] -
                                                element.transform[3]
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
                documentNode.content.push(currentBlock);
            }
        }

        return JSON.stringify(documentNode);
    }
}
