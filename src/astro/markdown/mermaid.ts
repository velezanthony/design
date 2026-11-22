import { defineMdastPlugin } from 'satteri';
import { translate } from '../../core/i18n/ui-strings';
import { markdownPlugin, type MarkdownEnv } from './env';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Bloque mermaid → `.docs-mermaid` con el código en un `pre` sin Shiki pero con el marcado de un bloque resaltado (cromo y copiar); HTML crudo porque el nodo de texto recorta la sangría, que en Mermaid es sintaxis. Va antes de `codeLanguages`. `data-loading-label` es el texto, ya localizado, que el CSS pinta mientras llega el dibujo (el CSS no lee el catálogo). */
export function mermaid(env: MarkdownEnv) {
  return markdownPlugin(env, ({ strings }) =>
    defineMdastPlugin({
      name: 'mermaid',
      code(node, context) {
        if (node.lang?.toLowerCase() !== 'mermaid') return;
        context.replaceNode(node, {
          type: 'html',
          value: `<div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="${escapeHtml(node.lang)}" data-loading-label="${escapeHtml(translate(strings, 'diagram.loading'))}" tabindex="0"><code>${escapeHtml(node.value)}</code></pre></div>`,
        });
      },
    }),
  );
}
