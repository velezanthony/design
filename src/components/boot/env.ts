import type { RailQuery } from '../../client/layout/layout';
import { RAIL_QUERY } from '../../client/layout/rail';
import type { MermaidImporter } from '../../client/diagrams/mermaid';
import { readToken } from '../../client/diagrams/token';
import { storageOf } from '../../client/preferences/storage';
import type { initTheme } from '../../client/preferences/theme';
import type { MotionPreference } from '../../client/transition';

/** El navegador que necesitan los `init*`; inyectable para probarlos sin globales. */
export interface BootEnv {
  htmlDocument: Document;
  storage: Storage | undefined;
  /** `sessionStorage`, para el desplazamiento de la barra lateral. */
  session?: Storage;
  /** La ventana, para saber cuándo se sale de la página (`pagehide`). Sin ella no se recuerda. */
  browserWindow?: Pick<Window, 'addEventListener'>;
  system: Parameters<typeof initTheme>[0]['system'];
  /** `(prefers-reduced-motion: reduce)`; sin él, las transiciones se permiten. */
  motion?: MotionPreference;
  /** `RAIL_QUERY`: desde ahí existe el raíl de los laterales (por debajo, el «Menú»). */
  rail?: RailQuery;
  /** Cómo cargar Mermaid y leer los tokens del tema. Sin él, los diagramas se quedan como código. */
  mermaid?: { importer: MermaidImporter; readToken: (name: string) => string };
  clipboard: Pick<Clipboard, 'writeText'> | undefined;
  hostname: string;
  reload: () => void;
  /** Para ir a otra ruta desde el selector «Por página» de un listado. Sin ella, no se cablea. */
  location?: Pick<Location, 'assign'>;
}

/** El entorno real. Se lee al ejecutar el script, nunca al importar el módulo. */
export function browserEnv(): BootEnv {
  return {
    htmlDocument: document,
    storage: storageOf('localStorage'),
    session: storageOf('sessionStorage'),
    browserWindow: window,
    system: matchMedia('(prefers-color-scheme: dark)'),
    motion: matchMedia('(prefers-reduced-motion: reduce)'),
    rail: matchMedia(RAIL_QUERY),
    /* `import('mermaid')` es un trozo aparte que el navegador solo descarga si una página lo pide. */
    mermaid: {
      importer: () => import('mermaid'),
      readToken: (name) => readToken(document, name),
    },
    clipboard: navigator.clipboard,
    hostname: location.hostname,
    reload: () => location.reload(),
    location,
  };
}
