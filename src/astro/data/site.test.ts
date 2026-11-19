import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:@velezanthony/design/config', () => ({
  default: {
    gtmId: 'GTM-TEST123',
    strings: { en: { backToTop: 'Back to top' }, es: { backToTop: 'Volver arriba' } },
  },
}));

const { designStrings, gtmId } = await import('./site');

describe('site', () => {
  it('devuelve los textos ya fusionados del idioma pedido', () => {
    expect(designStrings('es').backToTop).toBe('Volver arriba');
    expect(designStrings('en').backToTop).toBe('Back to top');
  });

  it('expone el gtmId resuelto', () => {
    expect(gtmId).toBe('GTM-TEST123');
  });

  it('falla con un idioma que el sitio no tiene', () => {
    expect(() => designStrings('fr')).toThrow(/fr/);
  });
});
