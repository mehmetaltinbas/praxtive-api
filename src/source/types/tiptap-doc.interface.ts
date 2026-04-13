export interface TipTapMark {
    type: 'bold' | 'italic' | string;
}

export interface TipTapTextNode {
    type: 'text';
    text: string;
    marks?: TipTapMark[];
}

export interface TipTapParagraphNode {
    type: 'paragraph';
    content?: TipTapTextNode[];
}

export interface TipTapDoc {
    type: 'doc';
    content: TipTapParagraphNode[];
}
