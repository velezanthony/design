import path from 'node:path';
import type { FSWatcher } from 'vite';

/** Recarga que agrupa avisos (UNA recarga extra si llega otro cambio mientras recarga); un fallo se informa y no bloquea. */
export function createReloader(
  run: () => Promise<void>,
  onError: (error: unknown) => void,
): () => Promise<void> {
  let running: Promise<void> | undefined;
  let pending = false;
  async function loop() {
    do {
      pending = false;
      try {
        await run();
      } catch (error) {
        onError(error);
      }
    } while (pending);
    running = undefined;
  }
  return () => {
    if (running) {
      pending = true;
      return running;
    }
    running = loop();
    return running;
  };
}

interface WatchOptions {
  /** Directorio de contenido nativo: altas y bajas de `.md` recargan. */
  nativeDir: string;
  /** Archivos externos (absolutos): sus cambios recargan. */
  files: readonly string[];
  reload: () => Promise<void>;
}

const EVENTS = ['change', 'add', 'unlink'] as const;

interface WatchState {
  nativeDir: string;
  external: Set<string>;
  reload: () => Promise<void>;
  /** Siempre el mismo: así se puede saber si el watcher sigue teniéndolo puesto. */
  handler: (file: string) => void;
}

/* Un estado por watcher: la última recarga y las últimas rutas mandan; el handler no cambia. */
const active = new WeakMap<object, WatchState>();

function createState(options: WatchOptions): WatchState {
  const state: WatchState = {
    nativeDir: options.nativeDir,
    external: new Set(),
    reload: options.reload,
    handler: (file) => {
      const relative = path.relative(state.nativeDir, file);
      const native =
        !relative.startsWith('..') && !path.isAbsolute(relative) && file.endsWith('.md');
      if (native || state.external.has(path.resolve(file))) void state.reload();
    },
  };
  return state;
}

/** Astro quita los listeners del loader antes de cada `load`: se comprueba cuáles siguen puestos y se reponen solo los que faltan. */
export function watchSources(watcher: FSWatcher, options: WatchOptions): void {
  const state = active.get(watcher) ?? createState(options);
  active.set(watcher, state);
  state.nativeDir = options.nativeDir;
  state.external = new Set(options.files.map((file) => path.resolve(file)));
  state.reload = options.reload;

  watcher.add([options.nativeDir, ...options.files]);
  for (const event of EVENTS) {
    if (!watcher.listeners(event).includes(state.handler)) watcher.on(event, state.handler);
  }
}
