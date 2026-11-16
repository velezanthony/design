/* Claves del almacenamiento del navegador, en un solo sitio. Son un contrato con el portfolio:
   si cambian, los visitantes pierden el tema y el consentimiento al saltar de un sitio a otro. */
export const THEME_KEY = 'theme';
/** Columnas plegadas y ancho elegidos en la página, un JSON `{ left, right, width }`. */
export const LAYOUT_KEY = 'docs:layout';
/** La respuesta del visitante al banner de cookies, en `localStorage`. */
export const CONSENT_KEY = 'consent';

/**
 * Lectura que no puede romper la página. Las ventanas privadas y los datos de sitio bloqueados
 * lanzan en cada llamada, y recordar el tema nunca justifica una excepción.
 */
export function safeGet(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** `true` si el valor quedó guardado. */
export function safeSet(storage: Storage | undefined, key: string, value: string): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** El almacenamiento del navegador, o `undefined`. Con los datos del sitio bloqueados, algunos
    navegadores lanzan con solo leer `localStorage`, antes de llamar a nada. */
export function storageOf(name: 'localStorage' | 'sessionStorage'): Storage | undefined {
  try {
    return globalThis[name];
  } catch {
    return undefined;
  }
}
