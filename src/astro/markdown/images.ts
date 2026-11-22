import { defineMdastPlugin, type Custom } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/** Párrafo con una sola imagen y nada más → `p.docs-screenshot`: lo que el CSS pinta como captura. El CSS no distingue un párrafo con texto de uno sin él, así que la captura se marca en positivo aquí. */
export function screenshots(env: MarkdownEnv) {
  return docsPlugin(env, () =>
    defineMdastPlugin({
      name: 'screenshots',
      paragraph(node, context) {
        const content = node.children.filter(
          (child) => !(child.type === 'text' && !child.value.trim()),
        );
        if (content.length !== 1 || content[0]?.type !== 'image') return;
        context.replaceNode(node, {
          type: 'docsElement',
          data: { hName: 'p', hProperties: { className: ['docs-screenshot'] } },
          children: [...node.children],
        } as Custom);
      },
    }),
  );
}
