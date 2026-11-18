import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/**
 * Envuelve cada tabla GFM en un contenedor que se desplaza en horizontal por su cuenta: la
 * tabla ancha no desborda la página. Es enfocable para poder desplazarla con el teclado.
 */
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
