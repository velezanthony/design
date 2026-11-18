import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { createReloader, watchSources } from './watch';

class FakeWatcher extends EventEmitter {
  added: string[] = [];
  add(paths: string | string[]) {
    this.added.push(...[paths].flat());
    return this;
  }
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('watchSources', () => {
  function setup() {
    const watcher = new FakeWatcher();
    const reload = vi.fn(async () => {});
    watchSources(watcher as never, {
      nativeDir: '/p/src/content/docs',
      files: ['/p/CHANGELOG.md'],
      reload,
    });
    return { watcher, reload };
  }

  it('vigila el directorio nativo y los archivos externos', () => {
    const { watcher } = setup();
    expect(watcher.added).toEqual(['/p/src/content/docs', '/p/CHANGELOG.md']);
  });

  it('change de un nativo o de un externo recarga todo', async () => {
    const { watcher, reload } = setup();
    watcher.emit('change', '/p/src/content/docs/guide.md');
    watcher.emit('change', '/p/CHANGELOG.md');
    await settle();
    expect(reload).toHaveBeenCalled();
  });

  it('add y unlink de un .md del directorio nativo recargan', async () => {
    const { watcher, reload } = setup();
    watcher.emit('add', '/p/src/content/docs/nueva.es.md');
    await settle();
    watcher.emit('unlink', '/p/src/content/docs/vieja.md');
    await settle();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('ignora lo que no es nuestro: otros directorios y no Markdown', async () => {
    const { watcher, reload } = setup();
    watcher.emit('change', '/p/src/pages/index.astro');
    watcher.emit('add', '/p/src/content/docs/imagen.png');
    watcher.emit('add', '/p/src/content/docs-old/a.md');
    await settle();
    expect(reload).not.toHaveBeenCalled();
  });

  it('una segunda carga no duplica listeners: manda la última función de recarga', async () => {
    const watcher = new FakeWatcher();
    const first = vi.fn(async () => {});
    const second = vi.fn(async () => {});
    const options = { nativeDir: '/p/docs', files: [] as string[] };
    watchSources(watcher as never, { ...options, reload: first });
    watchSources(watcher as never, { ...options, reload: second });
    watcher.emit('change', '/p/docs/a.md');
    await settle();
    expect(watcher.listenerCount('change')).toBe(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('watchSources: Astro quita los listeners en cada sincronización completa', () => {
  const options = { nativeDir: '/p/docs', files: [] as string[] };

  it('si el watcher pierde nuestros listeners, la siguiente carga los vuelve a enganchar', async () => {
    const watcher = new FakeWatcher();
    const first = vi.fn(async () => {});
    const second = vi.fn(async () => {});
    watchSources(watcher as never, { ...options, reload: first });
    // Lo que hace `ContentLayer.sync` antes de volver a llamar a `load`: removeAllTrackedListeners.
    watcher.removeAllListeners();
    watchSources(watcher as never, { ...options, reload: second });
    watcher.emit('add', '/p/docs/nueva/index.es.md');
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('si los listeners siguen puestos no se duplican', () => {
    const watcher = new FakeWatcher();
    watchSources(watcher as never, { ...options, reload: async () => {} });
    watchSources(watcher as never, { ...options, reload: async () => {} });
    for (const event of ['add', 'change', 'unlink']) {
      expect(watcher.listenerCount(event)).toBe(1);
    }
  });
});

describe('createReloader', () => {
  it('agrupa avisos mientras recarga y lanza una sola recarga más', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const run = vi.fn(async () => {
      if (run.mock.calls.length === 1) await gate;
    });
    const reload = createReloader(run, () => {});
    const first = reload();
    reload();
    reload();
    release();
    await first;
    await settle();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('un fallo se informa y no impide la siguiente recarga', async () => {
    const onError = vi.fn();
    let calls = 0;
    const reload = createReloader(async () => {
      if (calls++ === 0) throw new Error('enlace roto');
    }, onError);
    await reload();
    await reload();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });
});
