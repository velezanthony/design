import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import {
  applyAnalytics,
  GTM_ENV_VAR,
  invalidGtmIdError,
  isGtmId,
} from '../../core/analytics/resolve';
import type { ResolvedConfig } from '../../core/config/resolve';
import type { UrlPolicy } from '../../core/i18n/availability';
import { orAstroError } from '../errors';

/** Fuente de variables de entorno: `loadEnv` de Vite o un doble en los tests. */
export type LoadEnv = (mode: string, envDir: string, prefix: string) => Record<string, string>;

/** Modo de Vite según el comando de Astro: `dev` es development; build y el resto, production. */
export function modeOf(command: string): 'development' | 'production' {
  return command === 'dev' ? 'development' : 'production';
}

/** Valor de `PUBLIC_GTM_ID`: en `astro:config:setup` los `.env` aún no están en `process.env`, así que se leen con `loadEnv`. */
export function readAnalyticsEnv(
  command: string,
  root: URL,
  load: LoadEnv = loadEnv,
): string | undefined {
  return load(modeOf(command), fileURLToPath(root), 'PUBLIC_')[GTM_ENV_VAR];
}

/** `applyAnalytics` con los errores del núcleo traducidos a `AstroError`. */
export function applyAnalyticsOrThrow(
  config: ResolvedConfig,
  envValue: string | undefined,
  url: UrlPolicy,
) {
  return orAstroError('La analítica de `@velezanthony/design` no es válida.', () =>
    applyAnalytics(config, envValue, url),
  );
}

/** En dev un `PUBLIC_GTM_ID` mal formado avisa y se ignora (sin analítica) en vez de tumbar el servidor; la `gtmId` de la config manda y en build sigue fallando. */
export function envValueForCommand(
  command: string,
  envValue: string | undefined,
  configGtmId: string | undefined,
  warn: (message: string) => void,
) {
  const value = envValue?.trim();
  if (command !== 'dev' || !value || configGtmId?.trim() || isGtmId(value)) return envValue;
  warn(`${invalidGtmIdError(false).describe()} Se ignora: sin analítica en este servidor.`);
  return undefined;
}
