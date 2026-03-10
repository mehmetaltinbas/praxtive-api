import { InlineNode } from 'src/source/types/source-text-node/inline-node.interface';

export interface BlockNode {
    content: InlineNode[];
}
