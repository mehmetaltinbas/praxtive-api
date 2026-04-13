import { BadRequestException, Injectable } from '@nestjs/common';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { SourceType } from 'src/source/enums/source-type.enum';
import { SourceTypeStrategy } from 'src/source/strategies/type/source-type-strategy.interface';
import { ExtractionResult } from 'src/source/strategies/type/types/extraction-result.response';
import { PdfjsFontFaceObject } from 'src/source/strategies/type/types/pdfjs-font-face-object.interface';
import { CreateSourceDto } from 'src/source/types/dto/create-source.dto';
import { TipTapDoc, TipTapMark, TipTapParagraphNode, TipTapTextNode } from 'src/source/types/tiptap-doc.interface';

@Injectable()
export class DocumentSourceTypeStrategy implements SourceTypeStrategy {
    type = SourceType.DOCUMENT;

    async extract(dto: CreateSourceDto, file?: Express.Multer.File): Promise<ExtractionResult> {
        if (!file) throw new BadRequestException('File is required for document source type');
        if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are supported');

        const fileBuffer = file.buffer;

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(fileBuffer) }).promise;

        const doc: TipTapDoc = { type: 'doc', content: [] };

        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            await page.getOperatorList();

            let currentParagraph: TipTapTextNode[] = [];

            textContent.items.forEach((item: TextItem | TextMarkedContent) => {
                const element = item as TextItem;
                const font = page.commonObjs.get(element.fontName) as PdfjsFontFaceObject;
                const name = font?.name?.toLowerCase() ?? '';
                const bold = name.includes('bold');
                const italic = name.includes('italic') || name.includes('oblique');

                if (element.str.length > 0) {
                    const textNode: TipTapTextNode = {
                        type: 'text',
                        text: element.str,
                        marks: this.buildMarks(bold, italic),
                    };

                    if (!textNode.marks) delete textNode.marks;
                    currentParagraph.push(textNode);
                }

                if (element.hasEOL) {
                    const merged = this.mergeAdjacentTextNodes(currentParagraph);
                    const paragraph: TipTapParagraphNode = {
                        type: 'paragraph',
                        content: merged.length ? merged : [],
                    };

                    doc.content.push(paragraph);
                    currentParagraph = [];
                }
            });

            if (currentParagraph.length > 0) {
                const merged = this.mergeAdjacentTextNodes(currentParagraph);

                doc.content.push({ type: 'paragraph', content: merged });
            }
        }

        doc.content = doc.content.filter((p) => {
            if (!p.content || p.content.length === 0) return false;

            return p.content.some((t) => t.text.trim() !== '');
        });

        return { title: dto.title ?? file?.originalname ?? 'Untitled', text: JSON.stringify(doc) };
    }

    private buildMarks(bold: boolean, italic: boolean): TipTapMark[] | undefined {
        const marks: TipTapMark[] = [];

        if (bold) marks.push({ type: 'bold' });
        if (italic) marks.push({ type: 'italic' });

        return marks.length ? marks : undefined;
    }

    private mergeAdjacentTextNodes(nodes: TipTapTextNode[]): TipTapTextNode[] {
        return nodes.reduce<TipTapTextNode[]>((acc, node) => {
            const last = acc[acc.length - 1];

            if (last && this.marksEqual(last.marks, node.marks)) {
                last.text += node.text;
            } else {
                acc.push({ ...node });
            }

            return acc;
        }, []);
    }

    private marksEqual(a: TipTapMark[] | undefined, b: TipTapMark[] | undefined): boolean {
        const aTypes = (a ?? []).map((m) => m.type).sort();
        const bTypes = (b ?? []).map((m) => m.type).sort();

        if (aTypes.length !== bTypes.length) return false;

        return aTypes.every((t, i) => t === bTypes[i]);
    }
}
