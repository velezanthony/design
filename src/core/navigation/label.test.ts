import { describe, expect, it } from 'vitest';
import { resolveLabel } from './label';

describe('resolveLabel', () => {
  it('una cadena vale para todos los idiomas', () => {
    expect(resolveLabel('Guide', 'es', 'en')).toBe('Guide');
  });

  it('usa el idioma pedido', () => {
    expect(resolveLabel({ en: 'Guide', es: 'Guía' }, 'es', 'en')).toBe('Guía');
  });

  it('si falta el idioma, cae al idioma por defecto', () => {
    expect(resolveLabel({ en: 'Guide', fr: 'Guide FR' }, 'es', 'en')).toBe('Guide');
  });

  it('si tampoco está el idioma por defecto, el primero declarado', () => {
    expect(resolveLabel({ fr: 'Guide FR' }, 'es', 'en')).toBe('Guide FR');
  });
});
