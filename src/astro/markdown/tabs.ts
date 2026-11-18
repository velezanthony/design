import { AstroError } from 'astro/errors';
import { defineMdastPlugin, type Custom, type MdastNode } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

function element(hName: string, className: string, children: (MdastNode | Custom)[]): Custom {
  return {
    type: 'docsElement',
    data: { hName, hProperties: { className: [className] } },
    children,
  };
}

/**
 * Pestañas: `::::tabs` con una o más `:::tab[Etiqueta]`. Sin JS son paneles apilados, cada uno con su
 * etiqueta visible (marcado de `ui/molecules/Tabs.astro`); `client/content/tabs.ts` construye la
 * `tablist` y los roles. Una pestaña sin etiqueta, o fuera de un grupo, falla con el archivo.
 */
export function tabs(env: MarkdownEnv) {
  return docsPlugin(env, ({ file }) =>
    defineMdastPlugin({
      name: 'tabs',
      options: { position: true },
      containerDirective(node, ctx) {
        const where = `${file}${node.position ? `:${node.position.start.line}` : ''}`;
        if (node.name === 'tab') {
          // Las pestañas de un grupo también se visitan (el reemplazo del grupo es posterior).
          const parent = ctx.parent(node);
          if (parent?.type === 'containerDirective' && parent.name === 'tabs') return;
          throw new AstroError(
            `La directiva «:::tab» solo puede ir dentro de «::::tabs» (${where}).`,
            'Envuelve las pestañas en `::::tabs` (con más dos puntos que las `:::tab`).',
          );
        }
        if (node.name !== 'tabs') return;

        const panels = node.children.map((child) => {
          if (child.type !== 'containerDirective' || child.name !== 'tab') {
            throw new AstroError(
              `«::::tabs» solo admite pestañas «:::tab[Etiqueta]» (${where}).`,
              'Mueve el resto del contenido dentro de una pestaña.',
            );
          }
          const [first, ...body] = child.children;
          const label =
            first?.type === 'paragraph' && first.data?.directiveLabel === true
              ? ctx.textContent(first).trim()
              : '';
          if (!label) {
            throw new AstroError(
              `Una pestaña no tiene etiqueta en ${where}.`,
              'Escribe `:::tab[Etiqueta]`.',
            );
          }
          return element('div', 'docs-tab-panel', [
            element('div', 'docs-tab-label', [{ type: 'text', value: label }]),
            ...body,
          ]);
        });
        ctx.replaceNode(node, element('div', 'docs-tabs', panels));
      },
    }),
  );
}
