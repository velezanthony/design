import { VIRTUAL_CONFIG_ID } from '../virtual/plugin';

/**
 * ¿Es este el fallo de importar el módulo virtual cuando la integración no está registrada? Solo
 * ese caso merece el mensaje «falta `docs(config)`»; cualquier otro error (un fallo dentro del
 * módulo, otro import roto) tiene que salir tal cual, o el mensaje mandaría a buscar donde no es.
 */
export function isMissingVirtualConfig(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cannot find module') &&
    error.message.includes(VIRTUAL_CONFIG_ID)
  );
}
