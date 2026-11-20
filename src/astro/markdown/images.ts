import { defineMdastPlugin, type Custom } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/** Párrafo con texto e imágenes → `p.docs-inline-images`: el CSS no ve el texto, y sin la marca una imagen única entre palabras se pintaría como captura. */
export function inlineImages(env: MarkdownEnv) {
  return docsPlugin(env, () =>
    defineMdastPlugin({
      name: 'inline-images',
      paragraph(node, context) {
        const hasImage = node.children.some((child) => child.type === 'image');
        const hasText = node.children.some(
          (child) => child.type !== 'image' && !(child.type === 'text' && !child.value.trim()),
        );
        if (!hasImage || !hasText) return;
        context.replaceNode(node, {
          type: 'docsElement',
          data: { hName: 'p', hProperties: { className: ['docs-inline-images'] } },
          children: [...node.children],
        } as Custom);
      },
    }),
  );
}
