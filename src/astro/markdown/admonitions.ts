import { AstroError } from 'astro/errors';
import { defineMdastPlugin, type Custom, type MdastNode } from 'satteri';
import { translate, type UiKey } from '../../core/i18n/ui-strings';
import { docsPlugin, type MarkdownEnv } from './env';

/** Tipos de directiva `:::tipo` (design-tokens da un color de estado a cada uno). */
const ADMONITION_KINDS = ['note', 'info', 'tip', 'warning', 'danger', 'question'] as const;
export type AdmonitionKind = (typeof ADMONITION_KINDS)[number];

function isKind(name: string): name is AdmonitionKind {
  return (ADMONITION_KINDS as readonly string[]).includes(name);
}

/** Contenedores que pertenecen a `tabs.ts`: esta capa no los rechaza. */
const FOREIGN = new Set(['tabs', 'tab']);

function element(
  hName: string,
  properties: Record<string, unknown>,
  children: (MdastNode | Custom)[],
): Custom {
  return { type: 'docsElement', data: { hName, hProperties: properties }, children };
}

interface AdmonitionOptions {
  kind: AdmonitionKind;
  title: string;
  collapsed?: boolean;
  children: (MdastNode | Custom)[];
}

/**
 * Nodo de una admonición. Es el MISMO marcado que `ui/molecules/Admonition.astro`; lo usan las
 * directivas y las alertas de GitHub, así las dos sintaxis dan una salida idéntica.
 */
export function admonitionNode({
  kind,
  title,
  collapsed = false,
  children,
}: AdmonitionOptions): Custom {
  const text: Custom = { type: 'text', value: title };
  if (collapsed) {
    return element('details', { className: ['admonition'], 'data-kind': kind }, [
      element('summary', { className: ['admonition-title'] }, [text]),
      ...children,
    ]);
  }
  return element(
    'aside',
    { className: ['admonition'], 'data-kind': kind, role: 'note', 'aria-label': title },
    [element('p', { className: ['admonition-title'] }, [text]), ...children],
  );
}

/** Título por defecto de un tipo en el idioma de la página. */
export function kindTitle(strings: Parameters<typeof translate>[0], key: `admonition.${string}`) {
  return translate(strings, key as UiKey);
}

/**
 * Directivas contenedor `:::tipo[Título]{collapsed}`. Un tipo o un atributo desconocidos fallan
 * con archivo y nombre: una admonición mal escrita es contenido perdido, no algo que ignorar.
 */
export function admonitions(env: MarkdownEnv) {
  return docsPlugin(env, ({ file, strings }) =>
    defineMdastPlugin({
      name: 'admonitions',
      options: { position: true },
      containerDirective(node, context) {
        if (FOREIGN.has(node.name)) return;
        const where = `${file}${node.position ? `:${node.position.start.line}` : ''}`;
        if (!isKind(node.name)) {
          throw new AstroError(
            `Tipo de admonición desconocido «${node.name}» en ${where}.`,
            `Usa uno de: ${ADMONITION_KINDS.join(', ')}.`,
          );
        }
        const attributes = node.attributes ?? {};
        for (const [name, value] of Object.entries(attributes)) {
          if (name !== 'collapsed' || (value !== '' && value != null)) {
            throw new AstroError(
              `Atributo desconocido «${name}» en la admonición «${node.name}» de ${where}.`,
              'El único atributo admitido es `{collapsed}`, sin valor.',
            );
          }
        }
        const [first, ...rest] = node.children;
        const hasLabel = first?.type === 'paragraph' && first.data?.directiveLabel === true;
        const label = hasLabel ? context.textContent(first).trim() : '';
        context.replaceNode(
          node,
          admonitionNode({
            kind: node.name,
            title: label || kindTitle(strings, `admonition.${node.name}`),
            collapsed: 'collapsed' in attributes,
            children: hasLabel ? rest : node.children,
          }),
        );
      },
    }),
  );
}
