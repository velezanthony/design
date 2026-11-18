import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it } from 'vitest';
import { clientRegistry } from '../data/client-registry';
import { rememberClientRoutes, watchClientPages } from './client-pages';

const resolved = (pattern: string, origin = 'project') => ({
  pattern,
  origin,
  type: 'page',
  entrypoint: `src/pages${pattern}.astro`,
  params: [] as string[],
  generate: () => `${pattern}/`,
  patternRegex: new RegExp(`^${pattern}/$`),
});

beforeEach(() => {
  const registry = clientRegistry();
  registry.routes = [];
  registry.version = 0;
  delete registry.load;
});

describe('rememberClientRoutes', () => {
  it('guarda solo las páginas del cliente y avisa de que algo cambió', () => {
    rememberClientRoutes([resolved('/cv'), resolved('/[...slug]', 'external')] as never);
    const registry = clientRegistry();
    expect(registry.routes.map(({ pattern }) => pattern)).toEqual(['/cv']);
    expect(registry.routes[0]!.generate()).toBe('/cv/');
    expect(registry.routes[0]!.match?.('/cv/')).toBe(true);
    expect(registry.routes[0]!.match?.('/otra/')).toBe(false);
    expect(registry.version).toBe(1);
  });
});

describe('watchClientPages', () => {
  it('carga los módulos con el Vite del servidor y cada cambio de fichero invalida lo leído', async () => {
    const watcher = new EventEmitter();
    const loaded: string[] = [];
    const server = {
      watcher,
      ssrLoadModule: async (id: string) => {
        loaded.push(id);
        return {};
      },
    };
    watchClientPages(server as never);
    const registry = clientRegistry();
    await registry.load!('src/pages/cv.astro');
    expect(loaded).toEqual(['/src/pages/cv.astro']);
    watcher.emit('change', 'src/pages/cv.astro');
    expect(registry.version).toBe(1);
  });
});
