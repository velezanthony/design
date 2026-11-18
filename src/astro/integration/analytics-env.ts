import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { GTM_ENV_VAR } from '../../core/analytics/resolve';

/** Fuente de variables de entorno: `loadEnv` de Vite o un doble en los tests. */
export type LoadEnv = (mode: string, envDir: string, prefix: string) => Record<string, string>;

/** Modo de Vite según el comando de Astro: `dev` es development; build y el resto, production. */
export function modeOf(command: string): 'development' | 'production' {
  return command === 'dev' ? 'development' : 'production';
}

/**
 * Valor de `PUBLIC_GTM_ID` para este comando. En `astro:config:setup` los `.env` aún no están en
 * `process.env`, así que se leen con `loadEnv` (que deja ganar a las variables del proceso: la CI).
 * Solo decide de dónde sale el dato; si es válido o está vacío lo juzga `resolveAnalytics`.
 */
export function readAnalyticsEnv(
  command: string,
  root: URL,
  load: LoadEnv = loadEnv,
): string | undefined {
  return load(modeOf(command), fileURLToPath(root), 'PUBLIC_')[GTM_ENV_VAR];
}
