import { defineMdastPlugin, type Custom, type MdastNode } from 'satteri';
import { admonitionNode, kindTitle, type AdmonitionKind } from './admonitions';
import { docsPlugin, type MarkdownEnv } from './env';

/** Marcador de GitHub → [tipo visual, clave del título localizado]. `IMPORTANT` pinta como info. */
const ALERTS = {
  NOTE: ['note', 'admonition.note'],
  TIP: ['tip', 'admonition.tip'],
  IMPORTANT: ['info', 'admonition.important'],
  WARNING: ['warning', 'admonition.warning'],
  CAUTION: ['danger', 'admonition.caution'],
} as const satisfies Record<string, readonly [AdmonitionKind, `admonition.${string}`]>;

/* El marcador va SOLO en la primera línea: lo que lo sigue en esa línea lo invalida, como en GitHub. */
const MARKER = /^\[!([A-Za-z]+)\][ \t]*(?:\r?\n([\s\S]*))?$/;

/**
 * Alertas de GitHub (`> [!NOTE]`) → la misma admonición que la directiva. Sin título propio: el
 * título es la etiqueta de GitHub localizada. Un marcador desconocido, o con texto detrás, deja
 * la cita como `<blockquote>` normal y sin error.
 */
export function githubAlerts(env: MarkdownEnv) {
  return docsPlugin(env, ({ strings }) =>
    defineMdastPlugin({
      name: 'github-alerts',
      blockquote(node, ctx) {
        const [paragraph, ...rest] = node.children;
        if (paragraph?.type !== 'paragraph') return;
        const [head, ...inline] = paragraph.children;
        if (head?.type !== 'text') return;
        const match = MARKER.exec(head.value);
        const entry = match && ALERTS[match[1]!.toUpperCase() as keyof typeof ALERTS];
        if (!match || !entry) return;
        const after = match[2];
        // `[!NOTE] *x*`: hay más contenido en la línea del marcador, no es una alerta.
        if (after === undefined && inline.length > 0) return;

        const content: (MdastNode | Custom)[] = [...inline];
        if (after) content.unshift({ type: 'text', value: after });
        ctx.replaceNode(
          node,
          admonitionNode({
            kind: entry[0],
            title: kindTitle(strings, entry[1]),
            children: [
              ...(content.length > 0 ? [{ type: 'paragraph', children: content } as Custom] : []),
              ...rest,
            ],
          }),
        );
      },
    }),
  );
}
