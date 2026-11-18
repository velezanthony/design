import { defineMdastPlugin } from 'satteri';
import { docsPlugin, type MarkdownEnv } from './env';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Bloque mermaid → `.docs-mermaid` con el código en un `pre` sin Shiki pero con el marcado de un bloque resaltado (cromo y copiar); HTML crudo porque el nodo de texto recorta la sangría, que en Mermaid es sintaxis. Va antes de `codeLanguages`. */
export function mermaid(env: MarkdownEnv) {
  return docsPlugin(env, () =>
    defineMdastPlugin({
      name: 'mermaid',
      code(node, context) {
        if (node.lang?.toLowerCase() !== 'mermaid') return;
        context.replaceNode(node, {
          type: 'html',
          value: `<div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="${escapeHtml(node.lang)}" tabindex="0"><code>${escapeHtml(node.value)}</code></pre></div>`,
        });
      },
    }),
  );
}
