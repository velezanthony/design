import type { Plugin } from 'vite';

/** Id con el que el código del paquete importa la config validada. */
export const VIRTUAL_CONFIG_ID = 'virtual:@velezanthony/design/config';

/* El prefijo `\0` es la convención de Vite para ids virtuales: ningún otro plugin los toca. */
const RESOLVED_ID = `\0${VIRTUAL_CONFIG_ID}`;

/**
 * Plugin de Vite que sirve la config como módulo virtual (patrón de Starlight). Solo serializa
 * datos con `JSON.stringify`: nada de funciones ni de instancias.
 */
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
