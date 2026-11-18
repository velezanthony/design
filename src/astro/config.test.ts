import { describe, expect, it } from 'vitest';
import { urlPolicyOf } from './config';

describe('urlPolicyOf', () => {
  it('solo toma base y barra final de Astro, más el idioma por defecto', () => {
    const astro = { base: '/repo', trailingSlash: 'always' as const, site: 'https://x.dev' };
    expect(urlPolicyOf(astro, 'en')).toEqual({
      base: '/repo',
      trailingSlash: 'always',
      defaultLocale: 'en',
    });
  });
});
