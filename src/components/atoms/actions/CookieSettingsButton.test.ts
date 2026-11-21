import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import CookieSettingsButton from './CookieSettingsButton.astro';

async function button(props: Record<string, unknown> = {}) {
  const htmlDocument = await render(CookieSettingsButton, { strings: stringsFor('es'), ...props });
  return htmlDocument.querySelector('button')!;
}

describe('CookieSettingsButton', () => {
  /* El script de consentimiento escucha `[data-consent-open]`: ese atributo es el contrato. */
  it('es un <button type="button"> con data-consent-open', async () => {
    const element = await button();
    expect(element.tagName).toBe('BUTTON');
    expect(element.getAttribute('type')).toBe('button');
    expect(element.hasAttribute('data-consent-open')).toBe(true);
  });

  it('su nombre accesible es el texto de «consent.preferences» del idioma', async () => {
    expect(text(await button())).toBe('Preferencias de cookies');
    expect(text(await button({ strings: stringsFor('en') }))).toBe('Cookie preferences');
  });

  it('respeta un texto propio del sitio', async () => {
    const strings = stringsFor('es', { 'consent.preferences': 'Cookies' });
    expect(text(await button({ strings }))).toBe('Cookies');
  });

  /* Tailwind 4 pone `cursor: default` a los <button>; el objetivo táctil es de al menos 24px. */
  it('lleva puntero y un objetivo de al menos 24px', async () => {
    const element = await button();
    expect(element.classList.contains('cursor-pointer')).toBe(true);
    expect(element.classList.contains('min-h-6')).toBe(true);
  });

  it('pinta igual que un enlace tenue del pie', async () => {
    expect((await button()).className).toBe(
      'inline-flex cursor-pointer items-center min-h-6 text-muted hover:text-ink transition-colors',
    );
  });

  it('añade la clase que recibe, sin perder las suyas', async () => {
    const element = await button({ class: 'mt-auto' });
    expect(element.classList.contains('mt-auto')).toBe(true);
    expect(element.classList.contains('cursor-pointer')).toBe(true);
  });
});
