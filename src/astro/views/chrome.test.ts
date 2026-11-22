import { describe, expect, it } from 'vitest';

import { consentOf } from './chrome';

describe('consentOf', () => {
  const base = { site: { analytics: {} }, i18n: { defaultLocale: 'en' } };

  it('sin privacyUrl ni gtmId no lleva ninguna de las dos claves', () => {
    expect(consentOf(base, 'en')).toEqual({});
    expect(Object.keys(consentOf(base, 'en'))).toEqual([]);
  });

  it('con gtmId lo lleva, y sin privacyUrl esa clave sigue ausente', () => {
    const consent = consentOf({ ...base, site: { analytics: { gtmId: 'GTM-TEST001' } } }, 'en');
    expect(consent).toEqual({ gtmId: 'GTM-TEST001' });
    expect('privacyUrl' in consent).toBe(false);
  });

  it('resuelve la política de privacidad del idioma pedido', () => {
    const config = {
      ...base,
      site: { analytics: { privacyUrl: { en: '/privacy/', es: '/privacidad/' } } },
    };
    expect(consentOf(config, 'es')).toEqual({ privacyUrl: '/privacidad/' });
  });
});
