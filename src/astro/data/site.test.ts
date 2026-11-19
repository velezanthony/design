import { describe, expect, it, vi } from 'vitest';

vi.mock('virtual:@velezanthony/design/config', () => ({
  default: {
    gtmId: 'GTM-TEST123',
    defaultLocale: 'es',
    privacyUrl: { es: '/privacidad/', en: '/en/privacy/' },
    strings: { en: { backToTop: 'Back to top' }, es: { backToTop: 'Volver arriba' } },
  },
}));

const { designStrings, gtmId, privacyUrl } = await import('./site');

describe('site', () => {
  it('devuelve los textos ya fusionados del idioma pedido', () => {
    expect(designStrings('es').backToTop).toBe('Volver arriba');
    expect(designStrings('en').backToTop).toBe('Back to top');
  });

  it('expone el gtmId resuelto', () => {
    expect(gtmId).toBe('GTM-TEST123');
  });

  it('devuelve la URL de privacidad del idioma pedido', () => {
    expect(privacyUrl('es')).toBe('/privacidad/');
    expect(privacyUrl('en')).toBe('/en/privacy/');
  });

  it('falla con un idioma que el sitio no tiene', () => {
    expect(() => designStrings('fr')).toThrow(/fr/);
  });
});
