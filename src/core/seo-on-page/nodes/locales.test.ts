import { describe, expect, it } from 'vitest';
import { buildLocaleEntries } from './locales';

const locales = ['en', 'es'];

describe('buildLocaleEntries', () => {
  it('idioma presente: con su URL', () => {
    const available = { en: '/a/', es: '/es/a/' };
    expect(buildLocaleEntries(available, locales, 'link', () => false)).toEqual([
      { locale: 'en', status: 'present', url: '/a/' },
      { locale: 'es', status: 'present', url: '/es/a/' },
    ]);
  });

  it('idioma ausente: con la política aplicada y si se declaró, idioma a idioma', () => {
    const declared = (locale: string) => locale === 'es';
    expect(buildLocaleEntries({ en: '/a/' }, ['en', 'es', 'fr'], 'omit', declared)).toEqual([
      { locale: 'en', status: 'present', url: '/a/' },
      { locale: 'es', status: 'missing', policy: 'omit', declared: true },
      { locale: 'fr', status: 'missing', policy: 'omit', declared: false },
    ]);
  });
});
