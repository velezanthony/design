import { VIRTUAL_CONFIG_ID } from '../virtual/plugin';

/** Solo el fallo de importar el módulo virtual merece «falta `docs(config)`»; cualquier otro error debe salir tal cual. */
export function isMissingVirtualConfig(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cannot find module') &&
    error.message.includes(VIRTUAL_CONFIG_ID)
  );
}
