import { getViteConfig } from 'astro/config';
import { createVirtualConfigPlugin } from '../astro/virtual/plugin';

/** El plugin de producción del módulo virtual, para registrarlo en cualquier servidor de Vite. */
export const virtualConfigPlugin = createVirtualConfigPlugin;

/**
 * Config de Vite de Astro con el módulo virtual cargado por el MISMO plugin que usa la build.
 * Pensada para `vitest.config.ts` de un proyecto de pruebas de adaptadores.
 */
export const defineVirtualViteConfig = (data: unknown) =>
  getViteConfig({ plugins: [createVirtualConfigPlugin(data)] });
