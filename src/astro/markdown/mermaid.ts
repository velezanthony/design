import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Un bloque ```mermaid se convierte en el contenedor `.docs-mermaid[data-mermaid]` con el código
 * fuente dentro de un `pre` SIN resaltar: no pasa por Shiki (un diagrama no es código que colorear).
 * Pero lleva el mismo marcado que un bloque resaltado (`pre.astro-code[data-language]`), y eso es
 * lo que le da el cromo de un bloque de código sin duplicar nada: el CSS le pone la etiqueta del
 * lenguaje («mermaid») y `client/copy-code.ts` le añade el botón de copiar, que copia SIEMPRE el
 * código original y no el SVG. `client/mermaid.ts` añade el SVG solo en las páginas que lo tienen;
 * sin JavaScript el lector ve un bloque de código como cualquier otro.
 * Se emite como HTML crudo (escapado aquí) y no como nodo de texto porque este recorta la sangría
 * de las líneas, y en Mermaid la sangría es sintaxis (mindmap, gitGraph…).
 * Va ANTES de `codeLanguages`, que no debe avisar de un lenguaje que Shiki no conoce a propósito.
 */
export const mermaid = (env: MarkdownEnv) =>
  docsPlugin(env, () =>
    defineMdastPlugin({
      name: 'mermaid',
      code(node, ctx) {
        if (node.lang?.toLowerCase() !== 'mermaid') return;
        ctx.replaceNode(node, {
          type: 'html',
          value: `<div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="${escapeHtml(node.lang)}" tabindex="0"><code>${escapeHtml(node.value)}</code></pre></div>`,
        });
      },
    }),
  );
