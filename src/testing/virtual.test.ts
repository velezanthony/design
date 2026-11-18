import { createServer } from 'vite';
import { describe, expect, it } from 'vitest';
import { VIRTUAL_CONFIG_ID } from '../astro/virtual/plugin';
import { defineVirtualViteConfig, virtualConfigPlugin } from './virtual';

/** Carga el módulo virtual por la resolución real de Vite, con el plugin de producción. */
async function loadVirtual(data: unknown): Promise<unknown> {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    plugins: [virtualConfigPlugin(data)],
  });
  try {
    const module = await server.ssrLoadModule(VIRTUAL_CONFIG_ID);
    return module.default;
  } finally {
    await server.close();
  }
}

/* Cada test arranca un servidor de Vite real (y el último importa `astro/config`): en frío son
   ~1,3 s y bajo carga (suite completa en paralelo) superaban los 5 s por defecto de Vitest. Es
   coste inherente al arranque, no una espera sobrante: se le da margen explícito. */
const VITE_STARTUP_TIMEOUT = 30_000;

describe('módulo virtual de la config', { timeout: VITE_STARTUP_TIMEOUT }, () => {
  it('Vite lo resuelve y devuelve la config serializada', async () => {
    expect(await loadVirtual({ name: 'x', base: '/repo' })).toEqual({ name: 'x', base: '/repo' });
  });

  it('refleja otros datos (no es un valor fijo)', async () => {
    expect(await loadVirtual({ name: 'y', locales: ['en', 'es'] })).toEqual({
      name: 'y',
      locales: ['en', 'es'],
    });
  });

  it('defineVirtualViteConfig registra el plugin real en la config de Vite de Astro', async () => {
    const config = await defineVirtualViteConfig({ name: 'x' })({
      command: 'serve',
      mode: 'test',
    });
    const names = (config.plugins ?? [])
      .flat()
      .map((plugin) => (plugin as { name?: string } | null)?.name);
    expect(names).toContain('velezanthony-design-virtual-config');
  });
});
