import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import Translations from './Translations.astro';

const props = (translations: unknown[]) => ({ translations, slug: 'guide' });

describe('Translations', () => {
  it('van lado a lado y la ausente lleva su política', async () => {
    const doc = await render(
      Translations,
      props([
        { state: 'present', locale: 'en', current: true, url: '/repo/guide/' },
        { state: 'missing', locale: 'es', current: false, policy: 'link', declared: false },
      ]),
    );
    const columns = [...doc.querySelectorAll('[data-translation]')];
    expect(columns.map((c) => c.getAttribute('data-translation'))).toEqual(['en', 'es']);
    expect(columns[0]!.getAttribute('aria-current')).toBe('true');
    expect(text(columns[1])).toContain('Falta');
    expect(text(columns[1])).toContain('link');
    expect(text(columns[1])).toContain('sin declarar');
  });

  it('una traducción presente enseña su resumen y enlaza a su inspector', async () => {
    const doc = await render(
      Translations,
      props([
        {
          state: 'present',
          locale: 'es',
          current: false,
          url: '/repo/es/guide/',
          summary: { title: 'Guía | Site', description: undefined, problems: 2 },
          inspectHref: '/i/?slug=guide&locale=es',
        },
      ]),
    );
    const card = doc.querySelector('[data-translation="es"]')!;
    expect(card.querySelector('a[href="/i/?slug=guide&locale=es"]')).not.toBeNull();
    expect(text(card)).toContain('Guía | Site');
    expect(text(card)).toContain('2 problemas');
  });

  it('sin resumen enseña solo la URL, y la propia página no se enlaza', async () => {
    const doc = await render(
      Translations,
      props([{ state: 'present', locale: 'en', current: true, url: '/repo/guide/' }]),
    );
    const card = doc.querySelector('[data-translation="en"]')!;
    expect(text(card)).toContain('/repo/guide/');
    expect(card.querySelector('a')).toBeNull();
  });
});
