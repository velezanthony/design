import path from 'node:path';
import type { FSWatcher } from 'vite';

/**
 * Función de recarga que agrupa avisos: si llega otro cambio mientras se recarga, se hace UNA
 * recarga más al terminar (no una por aviso). Un fallo se informa y no bloquea las siguientes.
 */
export function createReloader(
  run: () => Promise<void>,
  onError: (error: unknown) => void,
): () => Promise<void> {
  let running: Promise<void> | undefined;
  let pending = false;
  const loop = async () => {
    do {
      pending = false;
      try {
        await run();
      } catch (error) {
        onError(error);
      }
    } while (pending);
    running = undefined;
  };
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

/**
 * Engancha el watcher de dev: cualquier cambio relevante dispara una recarga COMPLETA.
 *
 * Astro llama a `load` en cada sincronización completa y ANTES quita todos los listeners que los
 * loaders registraron en ese watcher (`removeAllTrackedListeners`), esperando que `load` los
 * vuelva a poner. Por eso no basta con recordar que ya enganchamos: en cada llamada se comprueba
 * qué listeners siguen puestos y se reponen solo los que faltan (así tampoco se duplican si
 * Astro llama a `load` sin quitarlos, como en una sincronización selectiva).
 */
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
