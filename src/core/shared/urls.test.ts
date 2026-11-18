import { describe, expect, it } from 'vitest';
import { baseUrl, trimBase, withBase } from './urls';

describe('trimBase', () => {
  it('quita todas las barras finales; la raíz queda vacía', () => {
    expect(trimBase('/repo/')).toBe('/repo');
    expect(trimBase('/repo//')).toBe('/repo');
    expect(trimBase('/repo')).toBe('/repo');
    expect(trimBase('/')).toBe('');
  });
});

describe('withBase', () => {
  it('pone la base delante de una ruta, sin barras dobles', () => {
    expect(withBase('/repo/', '/cv/')).toBe('/repo/cv/');
    expect(withBase('/', '/cv/')).toBe('/cv/');
  });
});

describe('baseUrl', () => {
  it('la base acabada en una sola barra', () => {
    expect(baseUrl('/repo')).toBe('/repo/');
    expect(baseUrl('/repo//')).toBe('/repo/');
    expect(baseUrl('/')).toBe('/');
  });
});
