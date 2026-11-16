import { afterEach, describe, expect, it } from 'vitest';

import { CONSENT_KEY, THEME_KEY, safeGet, safeSet, storageOf } from './storage';

/** Lo que entrega un navegador con los datos del sitio bloqueados: cada acceso lanza. */
const blocked = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

function memory(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  } as Storage;
}

/* Contrato compartido con el portfolio: si cambian las claves, los visitantes pierden su tema y
   su consentimiento al saltar de un sitio al otro. */
describe('claves', () => {
  it('conservan los nombres del portfolio', () => {
    expect(THEME_KEY).toBe('theme');
    expect(CONSENT_KEY).toBe('consent');
  });
});

describe('safeGet / safeSet', () => {
  it('devuelve lo que se escribió', () => {
    const storage = memory();
    expect(safeSet(storage, 'theme', 'dark')).toBe(true);
    expect(safeGet(storage, 'theme')).toBe('dark');
  });

  it('es null para una clave nunca escrita', () => {
    expect(safeGet(memory(), 'theme')).toBeNull();
  });

  /* Las ventanas privadas y los datos bloqueados lanzan al acceder; la página debe seguir viva. */
  it('absorbe un almacenamiento que lanza', () => {
    expect(safeGet(blocked, 'theme')).toBeNull();
    expect(safeSet(blocked, 'theme', 'dark')).toBe(false);
  });

  it('tolera que no haya almacenamiento', () => {
    expect(safeGet(undefined, 'theme')).toBeNull();
    expect(safeSet(undefined, 'theme', 'dark')).toBe(false);
  });
});

/* Con los datos del sitio bloqueados, algunos navegadores lanzan con solo nombrar `localStorage`. */
describe('storageOf', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  });

  it('entrega el almacenamiento cuando lo hay', () => {
    const storage = memory();
    Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
    expect(storageOf('sessionStorage')).toBe(storage);
  });

  it('es undefined si llegar a él lanza', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      get: () => {
        throw new DOMException('denied', 'SecurityError');
      },
      configurable: true,
    });
    expect(storageOf('sessionStorage')).toBeUndefined();
  });
});
