import { bundledLanguages, bundledLanguagesAlias } from 'shiki';
import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/** Lenguajes que Shiki no trae → gramática soportada (spike §5). */
export const SHIKI_LANG_ALIAS: Readonly<Record<string, string>> = {
  django: 'jinja',
  pycon: 'python',
};

/** Pseudolenguajes que Shiki trata como texto plano. */
const PLAIN = new Set(['text', 'txt', 'plain', 'plaintext', 'ansi']);

/**
 * Avisa de un bloque de código con un lenguaje que Shiki no conoce (ni por alias). No rompe la
 * build: Shiki lo pinta sin resaltado y el aviso dice qué archivo corregir.
 *
 * @param langAlias alias efectivos (los nuestros más los del consumidor).
 */
export const codeLanguages = (env: MarkdownEnv, langAlias: Readonly<Record<string, string>>) =>
  docsPlugin(env, ({ file }) =>
    defineMdastPlugin({
      name: 'code-languages',
      code(node) {
        const lang = node.lang?.toLowerCase();
        if (!lang || PLAIN.has(lang) || lang in bundledLanguages || lang in bundledLanguagesAlias) {
          return;
        }
        if (Object.keys(langAlias).some((alias) => alias.toLowerCase() === lang)) return;
        env.warn(
          `Lenguaje de código desconocido «${node.lang}» en ${file}: se muestra sin resaltado.`,
        );
      },
    }),
  );
