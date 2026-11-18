import { defineMdastPlugin } from 'satteri';

/* Factoría `({ fileURL }) => plugin`: sustituye el texto `PROBE` por un marcador con el idioma
   y el archivo que el plugin ve. Comprueba que `fileURL` llega también para los `external`. */
export function probeLocale({ fileURL }) {
  const file = fileURL ? fileURL.pathname.split('/').pop() : 'sin-fileURL';
  const locale = file.endsWith('.es.md') ? 'es' : 'en';
  return defineMdastPlugin({
    name: 'probe-locale',
    text(node, ctx) {
      if (node.value !== 'PROBE') return;
      ctx.replaceNode(node, {
        type: 'html',
        value: `<span data-probe-locale="${locale}" data-probe-file="${file}">sonda ${locale}</span>`,
      });
    },
  });
}
