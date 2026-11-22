import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../config/resolve';
import { DocsErrors } from '../errors';
import {
  DEFAULT_FAVICON_PATH,
  faviconErrors,
  faviconType,
  isLocalFavicon,
  publicFaviconPath,
  resolveFavicon,
} from './favicon';

describe('resolveFavicon', () => {
  it('sin config usa el favicon propio del paquete, con base', () => {
    expect(resolveFavicon(undefined, '/repo')).toEqual({
      href: `/repo${DEFAULT_FAVICON_PATH}`,
      type: 'image/png',
    });
  });

  it('la base `/` o con barra final no duplica barras', () => {
    expect(resolveFavicon(undefined, '/').href).toBe(DEFAULT_FAVICON_PATH);
    expect(resolveFavicon(undefined, '/repo/').href).toBe(`/repo${DEFAULT_FAVICON_PATH}`);
  });

  it('una ruta relativa de public/ se normaliza y lleva la base', () => {
    expect(resolveFavicon('favicon.svg', '/repo')).toEqual({
      href: '/repo/favicon.svg',
      type: 'image/svg+xml',
    });
  });

  it('una ruta con barra inicial lleva la base', () => {
    expect(resolveFavicon('/img/icon.ico', '/repo/')).toEqual({
      href: '/repo/img/icon.ico',
      type: 'image/x-icon',
    });
    expect(resolveFavicon('/favicon.svg', '/').href).toBe('/favicon.svg');
  });

  it('una URL https se usa tal cual, sin base', () => {
    expect(resolveFavicon('https://cdn.dev/i.png', '/repo')).toEqual({
      href: 'https://cdn.dev/i.png',
      type: 'image/png',
    });
  });

  it('extensión desconocida: sin type', () => {
    expect(resolveFavicon('/icon.webp', '/')).toEqual({ href: '/icon.webp' });
    expect(resolveFavicon('/icono', '/')).toEqual({ href: '/icono' });
  });
});

describe('faviconType', () => {
  it.each([
    ['/a.svg', 'image/svg+xml'],
    ['/a.PNG', 'image/png'],
    ['/a.ico', 'image/x-icon'],
    ['https://x.dev/a.svg?v=2', 'image/svg+xml'],
    ['/a.gif', undefined],
  ])('%s -> %s', (src, type) => {
    expect(faviconType(src)).toBe(type);
  });
});

describe('favicon local o remoto', () => {
  it('https es remoto; lo demás es local', () => {
    expect(isLocalFavicon('https://x.dev/a.png')).toBe(false);
    expect(isLocalFavicon('a.png')).toBe(true);
    expect(isLocalFavicon('/a.png')).toBe(true);
  });

  it('la ruta de public/ no lleva barra inicial', () => {
    expect(publicFaviconPath('/img/a.png')).toBe('img/a.png');
    expect(publicFaviconPath('img/a.png')).toBe('img/a.png');
  });
});

describe('faviconErrors', () => {
  it('una local ausente da un error accionable con el campo', () => {
    const [error] = faviconErrors('/falta.svg', false);
    expect(error?.describe()).toContain('favicon');
    expect(error?.describe()).toContain('/falta.svg');
    expect(error?.describe()).toContain('public/');
  });

  it('presente, remota o sin definir: sin errores', () => {
    expect(faviconErrors('/a.svg', true)).toEqual([]);
    expect(faviconErrors('https://x.dev/a.svg', false)).toEqual([]);
    expect(faviconErrors(undefined, false)).toEqual([]);
  });
});

describe('`favicon` en la config', () => {
  function messages(favicon: unknown): string[] {
    try {
      resolveConfig({ site: { name: 'X', favicon } } as never);
    } catch (error) {
      if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
      throw error;
    }
    return [];
  }

  it('acepta ruta relativa, con barra inicial y https', () => {
    expect(messages('favicon.svg')).toEqual([]);
    expect(messages('/favicon.svg')).toEqual([]);
    expect(messages('https://x.dev/i.png')).toEqual([]);
    expect(resolveConfig({ site: { name: 'X', favicon: 'a.svg' } }).favicon).toBe('a.svg');
  });

  it('rechaza http:// y otros esquemas, con la ruta `favicon`', () => {
    expect(messages('http://x.dev/i.png')[0]).toContain('favicon');
    expect(messages('data:image/png;base64,AAAA')[0]).toContain('favicon');
    expect(messages('//x.dev/i.png')[0]).toContain('favicon');
    expect(messages('')[0]).toContain('favicon');
  });
});
