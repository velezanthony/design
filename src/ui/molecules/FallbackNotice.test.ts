import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import FallbackNotice from './FallbackNotice.astro';

const props = { originalLocale: 'en', href: '/changelog/', strings: stringsFor('es') };
function notice(extra: Record<string, unknown> = {}) {
  return render(FallbackNotice, { ...props, ...extra });
}

describe('FallbackNotice', () => {
  it('muestra el texto translation.fallbackNotice del catálogo', async () => {
    expect(text(await notice())).toContain(
      'Esta página aún no está traducida. Estás leyendo el original.',
    );
  });

  it('enlaza al original con hreflang y lang, nombrado en su idioma', async () => {
    const anchor = (await notice()).querySelector('a')!;
    expect(anchor.getAttribute('href')).toBe('/changelog/');
    expect(anchor.getAttribute('hreflang')).toBe('en');
    expect(anchor.getAttribute('lang')).toBe('en');
    expect(text(anchor)).toBe('English');
  });

  it('es una nota accesible, en el idioma de la página', async () => {
    const el = (await notice()).querySelector('[role="note"]')!;
    expect(el).not.toBeNull();
  });

  it('el texto sale de strings: sobrescribir la clave lo cambia', async () => {
    const doc = await notice({
      strings: stringsFor('es', { 'translation.fallbackNotice': 'Solo en inglés.' }),
    });
    expect(text(doc)).toContain('Solo en inglés.');
  });

  it('un idioma sin nombre conocido usa su código', async () => {
    expect(text((await notice({ originalLocale: 'fr' })).querySelector('a'))).toBe('fr');
  });
});
