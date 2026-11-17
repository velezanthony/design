import { bundledLanguages, bundledLanguagesAlias } from 'shiki';
import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/** Lenguajes que Shiki no trae → gramática soportada (spike §5). */
export const SHIKI_LANG_ALIAS: Readonly<Record<string, string>> = {
  django: 'jinja',
  pycon: 'python',
};

/** «Sin resaltado» explícito: el autor dice que es texto plano, así que ni se avisa ni lleva etiqueta. */
const PLAIN = new Set(['text', 'txt', 'plain', 'plaintext']);

/** Pseudolenguaje de Shiki que no necesita gramática. */
const SPECIAL = new Set(['ansi']);

/** Un bloque con fence ocupa más líneas que su contenido (las del fence); uno con sangría, las mismas. */
const isFenced = (node: {
  value: string;
  position?: { start: { line: number }; end: { line: number } };
}) =>
  node.position !== undefined &&
  node.position.end.line - node.position.start.line + 1 > node.value.split('\n').length;

/**
 * Avisa de un bloque de código con un lenguaje que Shiki no conoce (ni por alias) y de los
 * bloques con fence sin lenguaje. No rompe la build: Shiki los pinta sin resaltado y el aviso
 * dice qué archivo (y línea) corregir.
 *
 * @param langAlias alias efectivos (los nuestros más los del consumidor).
 */
export const codeLanguages = (env: MarkdownEnv, langAlias: Readonly<Record<string, string>>) =>
  docsPlugin(env, ({ file }) =>
    defineMdastPlugin({
      name: 'code-languages',
      options: { position: true },
      code(node) {
        const lang = node.lang?.toLowerCase();
        if (!lang) {
          if (isFenced(node)) {
            env.warn(
              `${file}:${node.position?.start.line}: bloque de código sin lenguaje; usa \`\`\`text si es texto plano`,
            );
          }
          return;
        }
        if (
          PLAIN.has(lang) ||
          SPECIAL.has(lang) ||
          lang in bundledLanguages ||
          lang in bundledLanguagesAlias
        ) {
          return;
        }
        if (Object.keys(langAlias).some((alias) => alias.toLowerCase() === lang)) return;
        env.warn(
          `Lenguaje de código desconocido «${node.lang}» en ${file}: se muestra sin resaltado.`,
        );
      },
    }),
  );
