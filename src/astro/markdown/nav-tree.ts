import { AstroError } from 'astro/errors';
import { defineMdastPlugin, type Custom, type MdastNode } from 'satteri';
import { isNavSection } from '../../core/config/nav';
import { resolveLabel } from '../../core/navigation/label';
import {
  findNavSection,
  NAV_TREE_ATTRIBUTE,
  NAV_TREE_DESCRIPTIONS_ATTRIBUTE,
  navSectionNames,
} from '../../core/navigation/nav-tree';
import { markdownPlugin, localeOf, type MarkdownEnv } from './env';

const NAME = 'nav-tree';
const ATTRIBUTES = new Set(['section', 'descriptions']);

/** Hueco de un árbol: lo rellena la ruta (`splitNavTrees`), que es quien sabe el idioma que se pinta. */
function slot(section: number, descriptions: boolean): Custom {
  return {
    type: 'docsElement',
    data: {
      hName: 'div',
      hProperties: {
        [NAV_TREE_ATTRIBUTE]: String(section),
        [NAV_TREE_DESCRIPTIONS_ATTRIBUTE]: String(descriptions),
      },
    },
    children: [],
  };
}

/** `::nav-tree` → por cada sección de `nav`, un h2 con su etiqueta (entra en el índice y tiene ancla) y el hueco de su árbol. `{section="…"}` deja una sola; `{descriptions="false"}` quita las descripciones. Una sección, un atributo o un valor que no existen rompen el build. */
export function navTree(env: MarkdownEnv) {
  return markdownPlugin(env, ({ file, fileURL, inDocs }) => {
    const locale = localeOf(env, fileURL);
    const names = navSectionNames(env.nav, locale, env.defaultLocale);
    function fail(message: string, line: number | undefined, hint: string): never {
      throw new AstroError(`${message} (${file}${line === undefined ? '' : `:${line}`}).`, hint);
    }
    return defineMdastPlugin({
      name: 'nav-tree',
      options: { position: true },
      containerDirective(node) {
        if (node.name !== NAME) return;
        fail(
          '«:::nav-tree» no es un contenedor',
          node.position?.start.line,
          'Escribe `::nav-tree` en su propia línea, con dos puntos y sin contenido.',
        );
      },
      leafDirective(node, context) {
        if (node.name !== NAME) return;
        const line = node.position?.start.line;
        if (!inDocs) {
          fail(
            '«::nav-tree» solo funciona en la documentación',
            line,
            'Pinta el árbol de `content.nav`: úsalo en una página de `content.dir`.',
          );
        }
        if (node.children.length > 0) {
          fail('«::nav-tree» no lleva texto', line, 'Quita los corchetes: `::nav-tree`.');
        }
        const attributes = node.attributes ?? {};
        for (const key of Object.keys(attributes)) {
          if (!ATTRIBUTES.has(key)) {
            fail(
              `«::nav-tree» no admite el atributo «${key}»`,
              line,
              'Admite `section="<etiqueta de una sección de nav>"` y `descriptions="false"`.',
            );
          }
        }
        const { section, descriptions = 'true' } = attributes;
        if (descriptions !== 'true' && descriptions !== 'false') {
          fail(
            `«::nav-tree»: descriptions="${descriptions}" debe ser "true" o "false"`,
            line,
            'Escribe `descriptions="false"` para quitar las descripciones; sin él, salen.',
          );
        }
        if (names.length === 0) {
          fail(
            '«::nav-tree» necesita secciones en `content.nav` y la config no tiene ninguna',
            line,
            'Declara en `content.nav` secciones con `sidebar` o `dir`, o quita la directiva.',
          );
        }
        let indexes = env.nav.flatMap((item, index) => (isNavSection(item) ? [index] : []));
        if (section !== undefined && section !== null) {
          const index = findNavSection(env.nav, section);
          if (index === -1) {
            fail(
              `«::nav-tree»: no hay ninguna sección «${section}» en \`nav\``,
              line,
              `Nombra una sección por su etiqueta (en cualquier idioma) o su \`dir\`: ${names.map((name) => `«${name}»`).join(', ')}.`,
            );
          }
          indexes = [index];
        }
        const nodes: (MdastNode | Custom)[] = indexes.flatMap((index) => {
          const item = env.nav[index]!;
          return [
            {
              type: 'heading',
              depth: 2,
              children: [
                { type: 'text', value: resolveLabel(item.label, locale, env.defaultLocale) },
              ],
            } as MdastNode,
            slot(index, descriptions === 'true'),
          ];
        });
        context.replaceNode(node, nodes as never);
      },
    });
  });
}
