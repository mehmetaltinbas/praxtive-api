import { InlineNode } from 'src/source/types/inline-node.interface';

export function mergeInlineNodes(nodes: InlineNode[]): InlineNode[] {
    return nodes.reduce<InlineNode[]>((acc, node) => {
        const last = acc[acc.length - 1];

        if (
            last &&
            last.styles.fontSize === node.styles.fontSize &&
            last.styles.bold === node.styles.bold &&
            last.styles.italic === node.styles.italic
        ) {
            last.text += node.text;
        } else {
            acc.push({ ...node });
        }

        return acc;
    }, []);
}
