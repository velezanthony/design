import { getViteConfig } from 'astro/config';
import { createVirtualConfigPlugin } from '../astro/virtual/plugin';

/** El plugin de producción del módulo virtual, para registrarlo en cualquier servidor de Vite. */
export const virtualConfigPlugin = createVirtualConfigPlugin;

/** Config de Vite de Astro con el módulo virtual cargado por el MISMO plugin que la build, para el `vitest.config.ts` de un proyecto de pruebas. */
export function defineVirtualViteConfig(data: unknown) {
  return getViteConfig({ plugins: [createVirtualConfigPlugin(data)] });
}
