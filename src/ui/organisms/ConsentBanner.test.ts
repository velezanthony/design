import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import BackToTop from './BackToTop.astro';
import ConsentBanner from './ConsentBanner.astro';

const props = { gtmId: 'GTM-TEST', privacyUrl: '/privacidad/', strings: stringsFor('es') };
async function banner(extra: Record<string, unknown> = {}) {
  return (await render(ConsentBanner, { ...props, ...extra })).querySelector(
    '[data-consent-banner]',
  )!;
}

describe('ConsentBanner', () => {
  it('nace oculto: sin JS no hay nada que lo conteste', async () => {
    expect((await banner()).hasAttribute('hidden')).toBe(true);
  });

  it('es una región con nombre, no un diálogo modal', async () => {
    const el = await banner();
    expect(el.tagName).toBe('SECTION');
    expect(el.getAttribute('aria-label')).toBe('Aviso de cookies');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-modal')).toBeNull();
  });

  it('entrega gtmId por props al script', async () => {
    expect((await banner()).getAttribute('data-gtm-id')).toBe('GTM-TEST');
    expect((await banner({ gtmId: 'GTM-OTRO' })).getAttribute('data-gtm-id')).toBe('GTM-OTRO');
  });

  it('enlaza a la privacidad que se le pasa, tal cual', async () => {
    expect((await banner()).querySelector('a')!.getAttribute('href')).toBe('/privacidad/');
    const abs = await banner({ privacyUrl: 'https://example.com/privacy' });
    expect(abs.querySelector('a')!.getAttribute('href')).toBe('https://example.com/privacy');
    expect(text(abs.querySelector('a'))).toBe('Política de privacidad');
  });

  it('acepta y rechaza con el mismo aspecto', async () => {
    const el = await banner();
    const accept = el.querySelector('[data-consent-accept]')!;
    const reject = el.querySelector('[data-consent-reject]')!;
    expect(text(accept)).toBe('Aceptar');
    expect(text(reject)).toBe('Rechazar');
    expect(accept.tagName).toBe('BUTTON');
    expect(accept.getAttribute('class')).toBe(reject.getAttribute('class'));
  });

  it('textos del catálogo: otro idioma y override', async () => {
    const el = await banner({ strings: stringsFor('en', { 'consent.accept': 'Yes' }) });
    expect(text(el.querySelector('[data-consent-accept]'))).toBe('Yes');
    expect(text(el.querySelector('[data-consent-reject]'))).toBe('Reject');
    expect(el.getAttribute('aria-label')).toBe('Cookie notice');
  });
});

describe('BackToTop', () => {
  it('es un enlace a #top con nombre accesible localizado', async () => {
    const link = (await render(BackToTop, { strings: stringsFor('es') })).querySelector('a')!;
    expect(link.getAttribute('href')).toBe('#top');
    expect(link.getAttribute('aria-label')).toBe('Volver arriba');
    expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const en = (await render(BackToTop, { strings: stringsFor('en') })).querySelector('a')!;
    expect(en.getAttribute('aria-label')).toBe('Back to top');
  });
});
