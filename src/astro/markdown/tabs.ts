import { AstroError } from 'astro/errors';
import { defineMdastPlugin, type Custom, type MdastNode } from 'satteri';
import { markdownPlugin, type MarkdownEnv } from './env';

function element(hName: string, className: string, children: (MdastNode | Custom)[]): Custom {
  return {
    type: 'docsElement',
    data: { hName, hProperties: { className: [className] } },
    children,
  };
}

/** `::::tabs` con `:::tab[Etiqueta]`; sin JS son paneles apilados y `client/content/tabs.ts` crea la `tablist`; sin etiqueta o fuera de un grupo falla. */
export function tabs(env: MarkdownEnv) {
  return markdownPlugin(env, ({ file }) =>
    defineMdastPlugin({
      name: 'tabs',
      options: { position: true },
      containerDirective(node, context) {
        const where = `${file}${node.position ? `:${node.position.start.line}` : ''}`;
        if (node.name === 'tab') {
          // Las pestañas de un grupo también se visitan (el reemplazo del grupo es posterior).
          const parent = context.parent(node);
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
              ? context.textContent(first).trim()
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
        context.replaceNode(node, element('div', 'docs-tabs', panels));
      },
    }),
  );
}
