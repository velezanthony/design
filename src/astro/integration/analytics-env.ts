import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import {
  applyAnalytics,
  GTM_ENV_VAR,
  invalidGtmIdError,
  isGtmId,
  missingPrivacyUrlError,
  resolveAnalytics,
} from '../../core/analytics/resolve';
import type { ResolvedConfig } from '../../core/config/resolve';
import { orAstroError } from '../errors';

/** Título de los errores de analítica. */
const ANALYTICS_ERROR = 'La analítica de `@velezanthony/design` no es válida.';

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

/** `applyAnalytics` con los errores del núcleo traducidos a `AstroError`; `enabled: false` deja la analítica apagada. */
function applyAnalyticsOrThrow(
  config: ResolvedConfig,
  envValue: string | undefined,
  enabled = true,
) {
  return orAstroError(ANALYTICS_ERROR, () => applyAnalytics(config, envValue, enabled));
}

/** Aplica la analítica: en build, un ID sin `privacyUrl` es un error; en dev avisa y arranca sin analítica (un ID mal formado sigue siendo un error). */
export function applyAnalyticsForCommand(
  command: string,
  config: ResolvedConfig,
  envValue: string | undefined,
  warn: (message: string) => void,
) {
  const value = envValueForCommand(command, envValue, config.gtmId, warn);
  if (command === 'dev' && config.privacyUrl === undefined) {
    const id = orAstroError(ANALYTICS_ERROR, () => resolveAnalytics(value, config.gtmId));
    if (id !== undefined) {
      warn(`${missingPrivacyUrlError().describe()} Se ignora: sin analítica en este servidor.`);
      return applyAnalyticsOrThrow(config, value, false);
    }
  }
  return applyAnalyticsOrThrow(config, value);
}
