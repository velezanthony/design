import { bundledLanguages, bundledLanguagesAlias } from 'shiki';
import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

/**
 * Nombres que los autores escriben y Shiki no trae → gramática soportada. Lo que Shiki ya resuelve
 * solo (`console`, `py`, `js`, `ts`, `yml`, `sh`, `zsh`, `jsonc`, `dockerfile`, `docker`) no se
 * repite aquí. `console` ya es `shellsession`, así que se pinta como sesión de shell.
 */
export const SHIKI_LANG_ALIAS: Readonly<Record<string, string>> = {
  django: 'jinja',
  htmldjango: 'jinja',
  pycon: 'python',
  env: 'dotenv',
  '.env': 'dotenv',
  terminal: 'shellsession',
  'shell-session': 'shellsession',
};

/** «Sin resaltado» explícito: el autor dice que es texto plano, así que ni se avisa ni lleva etiqueta. */
const PLAIN = new Set(['text', 'txt', 'plain', 'plaintext']);

/** Pseudolenguaje de Shiki que no necesita gramática. */
const SPECIAL = new Set(['ansi']);

/** Un bloque con fence ocupa más líneas que su contenido (las del fence); uno con sangría, las mismas. */
function isFenced(node: {
  value: string;
  position?: { start: { line: number }; end: { line: number } };
}) {
  return (
    node.position !== undefined &&
    node.position.end.line - node.position.start.line + 1 > node.value.split('\n').length
  );
}

/**
 * Avisa de un bloque de código con un lenguaje que Shiki no conoce (ni por alias) y de los
 * bloques con fence sin lenguaje. No rompe la build: Shiki los pinta sin resaltado y el aviso
 * dice qué archivo (y línea) corregir.
 *
 * @param langAlias alias efectivos (los nuestros más los del consumidor).
 */
export function codeLanguages(env: MarkdownEnv, langAlias: Readonly<Record<string, string>>) {
  return docsPlugin(env, ({ file }) =>
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
}
