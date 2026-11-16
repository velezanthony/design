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

/* Un solo juego de listeners por watcher aunque Astro vuelva a llamar a `load`: manda la última recarga. */
const active = new WeakMap<object, { reload: () => Promise<void> }>();

/** Engancha el watcher de dev: cualquier cambio relevante dispara una recarga COMPLETA. */
export function watchSources(watcher: FSWatcher, options: WatchOptions): void {
  const { nativeDir, files } = options;
  const known = active.get(watcher);
  if (known) {
    known.reload = options.reload;
    return;
  }
  const state = { reload: options.reload };
  active.set(watcher, state);
  watcher.add([nativeDir, ...files]);

  const external = new Set(files.map((file) => path.resolve(file)));
  const inNative = (file: string) => {
    const relative = path.relative(nativeDir, file);
    return !relative.startsWith('..') && !path.isAbsolute(relative) && file.endsWith('.md');
  };
  const react = (file: string) => {
    if (inNative(file) || external.has(path.resolve(file))) void state.reload();
  };
  watcher.on('change', react);
  watcher.on('add', react);
  watcher.on('unlink', react);
}
