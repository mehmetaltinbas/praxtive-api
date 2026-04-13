import { TipTapDoc } from 'src/source/types/tiptap-doc.interface';

export function plainTextToTipTap(text: string): TipTapDoc {
    const lines = text.split(/\r?\n/);

    return {
        type: 'doc',
        content: lines.map((line) => ({
            type: 'paragraph',
            content: line.length ? [{ type: 'text', text: line }] : [],
        })),
    };
}
