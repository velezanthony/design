import type { Plugin } from 'vite';

/** Id con el que el código del paquete importa la config validada. */
export const VIRTUAL_CONFIG_ID = 'virtual:@velezanthony/design/config';

/* El prefijo `\0` es la convención de Vite para ids virtuales: ningún otro plugin los toca. */
const RESOLVED_ID = `\0${VIRTUAL_CONFIG_ID}`;

/** Sirve la config como módulo virtual (patrón de Starlight) con `JSON.stringify`: nada de funciones ni instancias. */
export function createVirtualConfigPlugin(data: unknown): Plugin {
  const source = `export default ${JSON.stringify(data)};`;
  return {
    name: 'velezanthony-design-virtual-config',
    resolveId: {
      filter: { id: /^virtual:@velezanthony\/design\/config$/ },
      handler: () => RESOLVED_ID,
    },
    load: { filter: { id: /^\0virtual:@velezanthony\/design\/config$/ }, handler: () => source },
  };
}

/** Id del pie de las páginas de docs: el del sitio (`components.Footer`) o `DocsFooter`. */
export const VIRTUAL_FOOTER_ID = 'virtual:@velezanthony/design/components/Footer';

const RESOLVED_FOOTER_ID = `\0${VIRTUAL_FOOTER_ID}`;

/** Sirve el pie como módulo virtual que reexporta el `.astro` elegido; la ruta llega ya resuelta y comprobada. */
export function createVirtualFooterPlugin(file: string): Plugin {
  const source = `export { default } from ${JSON.stringify(file)};`;
  return {
    name: 'velezanthony-design-footer',
    resolveId: {
      filter: { id: /^virtual:@velezanthony\/design\/components\/Footer$/ },
      handler: () => RESOLVED_FOOTER_ID,
    },
    load: {
      filter: { id: /^\0virtual:@velezanthony\/design\/components\/Footer$/ },
      handler: () => source,
    },
  };
}
