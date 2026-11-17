import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import type { DocsUserConfig } from '../core/config/schema';
import { buildFixtureFailing, type FailedBuild } from './build';

/**
 * Un proyecto consumidor mínimo descrito como datos: la config y los archivos de la carpeta de
 * contenido (`src/content/docs`, o la de `config.content`: si es una ruta de fuera, p. ej.
 * `../docs`, el proyecto de Astro se escribe en `site/` para que `../docs` caiga dentro del caso).
 */
export interface BuildCase {
  name: string;
  config: DocsUserConfig;
  /** Ruta bajo la carpeta de contenido -> contenido. */
  docs: Record<string, string>;
  /** Ruta bajo la raíz del proyecto de Astro -> contenido (p. ej. `public/og.png`; `../CHANGELOG.md` queda fuera de él). */
  extra?: Record<string, string | Uint8Array>;
}

const casesDir = resolve('src/astro/integration/builds/fixtures/strict/.cases');

/** `import` relativo (con `./`) desde un archivo de `dir` hasta `target`. */
function importPath(dir: string, target: string): string {
  const path = relative(dir, resolve(target)).split('\\').join('/');
  return path.startsWith('.') ? path : `./${path}`;
}

/**
 * Escribe el caso en `fixtures/strict/.cases/<name>/` (ignorado por git), lo construye esperando
 * que FALLE, y borra la carpeta. Los casos de reglas estrictas comparten así un único esqueleto
 * en vez de una carpeta de fixture por regla.
 */
export async function buildFailingCase(buildCase: BuildCase): Promise<FailedBuild> {
  const caseDir = resolve(casesDir, buildCase.name);
  const contentDir = buildCase.config.content ?? 'src/content/docs';
  // Con contenido fuera del proyecto, este vive en `site/` y `..` cae dentro de la carpeta del caso.
  const root = contentDir.startsWith('..') ? resolve(caseDir, 'site') : caseDir;
  const write = async (relativePath: string, content: string | Uint8Array) => {
    const file = resolve(root, relativePath);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  await rm(caseDir, { recursive: true, force: true });
  try {
    await write(
      'astro.config.mjs',
      `import { defineConfig } from 'astro/config';
import { docs } from '${importPath(root, 'src/astro/integration/index.ts')}';
import docsConfig from './docs.config.mjs';

export default defineConfig({
  site: 'https://example.dev',
  base: '/repo',
  trailingSlash: 'always',
  integrations: [docs(docsConfig)],
});
`,
    );
    await write(
      'docs.config.mjs',
      `export default ${JSON.stringify(buildCase.config, null, 2)};\n`,
    );
    await write(
      'src/content.config.ts',
      `import { defineCollection } from 'astro:content';
import docsConfig from '../docs.config.mjs';
import { docsLoader } from '${importPath(resolve(root, 'src'), 'src/astro/loader/index.ts')}';
import { docsSchema } from '${importPath(resolve(root, 'src'), 'src/astro/loader/schema.ts')}';

export const collections = {
  docs: defineCollection({ loader: docsLoader(docsConfig), schema: docsSchema() }),
};
`,
    );
    for (const [path, content] of Object.entries(buildCase.docs)) {
      await write(`${contentDir}/${path}`, content);
    }
    for (const [path, content] of Object.entries(buildCase.extra ?? {})) {
      await write(path, content);
    }
    return await buildFixtureFailing(root);
  } finally {
    await rm(caseDir, { recursive: true, force: true });
  }
}
