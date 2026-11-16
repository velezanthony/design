import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * El entorno del worker de Vitest trae `BASE_URL=/`, `MODE`, `NODE_ENV=test`...; Vite los lee como
 * `import.meta.env` y pisarían el `base` de la fixture. Se heredan solo las variables ajenas.
 */
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(BASE_URL|MODE|DEV|PROD|SSR|NODE_ENV)$|^VITEST/.test(key)) delete env[key];
  }
  return env;
}

export interface BuiltSite {
  /** Carpeta `dist/` generada. */
  dist: string;
  /** Salida combinada (stdout + stderr) de `astro build`, para comprobar avisos. */
  output: string;
  /** Lee un archivo de `dist/` como texto. */
  read: (relativePath: string) => Promise<string>;
}

/**
 * Construye de verdad un proyecto de `fixtures/` con `astro build` en un proceso aparte (no dentro
 * del worker de Vitest: así Astro y Vite arrancan limpios). Es la forma de comprobar lo que solo
 * existe en una build real: el loader dentro del content layer, Pagefind, `base`.
 */
export async function buildFixture(root: string): Promise<BuiltSite> {
  const astroBin = resolve('node_modules/astro/bin/astro.mjs');
  const { stdout, stderr } = await run(process.execPath, [astroBin, 'build', '--root', root], {
    cwd: root,
    env: { ...cleanEnv(), ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
    maxBuffer: 16 * 1024 * 1024,
  });
  const dist = resolve(root, 'dist');
  return {
    dist,
    output: `${stdout}\n${stderr}`,
    read: (relativePath) => readFile(resolve(dist, relativePath), 'utf8'),
  };
}
