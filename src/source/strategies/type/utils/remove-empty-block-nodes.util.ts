import { BlockNode } from 'src/source/types/source-text-node/block-node.interface';

export function removeEmptyBlockNodes(blocks: BlockNode[]): BlockNode[] {
    return blocks.filter(
        (block) =>
            block.content.length > 0 &&
            block.content.some((inline) => inline.text.trim() !== ''),
    );
}
