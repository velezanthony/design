import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/** Envuelve cada tabla GFM en un contenedor con scroll horizontal, enfocable para usarlo con teclado. */
export function scrollableTables(env: MarkdownEnv) {
  return docsPlugin(env, () =>
    defineMdastPlugin({
      name: 'scrollable-tables',
      table(node, context) {
        context.wrapNode(node, {
          type: 'docsElement',
          data: {
            hName: 'div',
            hProperties: { className: ['table-scroll'], tabindex: '0' },
          },
          children: [],
        });
      },
    }),
  );
}
