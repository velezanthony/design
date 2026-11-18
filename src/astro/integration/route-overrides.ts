import { existsSync } from 'node:fs';
import { injectedPaths, type RouteOptions } from '../routes/routes';

/** Extensiones con las que Astro enruta un fichero de `src/pages/` (páginas y endpoints). */
const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'ts', 'js', 'mts', 'mjs'];

/** Una ruta de la librería que el sitio sustituye con un fichero suyo. */
export interface RouteOverride {
  /** El fichero del sitio, como se escribe (`src/pages/index.astro`). */
  file: string;
  /** La ruta sustituida, como ruta de fichero sin extensión (`index`, `es/404`, `sitemap.xml`). */
  route: string;
}

/** Rutas de la librería que el sitio sustituye con un fichero suyo en `src/pages/`; no es error, pero se avisa al arrancar. */
export function routeOverrides(pagesDir: URL, options: RouteOptions): RouteOverride[] {
  const overrides: RouteOverride[] = [];
  for (const route of injectedPaths(options)) {
    // Las rutas con extensión (`sitemap.xml`) valen tal cual o como endpoint (`sitemap.xml.ts`).
    const named = /\.[a-z]+$/.test(route);
    for (const extension of ['', ...PAGE_EXTENSIONS.map((pageExtension) => `.${pageExtension}`)]) {
      if (!named && extension === '') continue;
      const file = `${route}${extension}`;
      if (existsSync(new URL(file, pagesDir))) overrides.push({ file: `src/pages/${file}`, route });
    }
  }
  return overrides;
}

/** El aviso del arranque: cuántas rutas de la librería sustituye el sitio y con qué ficheros. */
export function overrideWarning(overrides: readonly RouteOverride[]): string | undefined {
  if (overrides.length === 0) return undefined;
  const count = overrides.length === 1 ? '1 ruta' : `${overrides.length} rutas`;
  return `Tu sitio sustituye ${count} de @velezanthony/design: ${overrides.map(({ file }) => file).join(', ')}. Se publican tus páginas en su lugar.`;
}
