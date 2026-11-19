import { describe, expect, it } from 'vitest';

import type { HeadConfig } from '../../core/seo/head';
import { renderDocument } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import BaseLayout from './BaseLayout.astro';

const head: HeadConfig[] = [
  { tag: 'title', attrs: {}, content: 'Inicio · Sitio' },
  { tag: 'link', attrs: { rel: 'canonical', href: 'https://x.dev/' } },
];

function props(extra: Record<string, unknown> = {}) {
  return { lang: 'es', head, ...extra };
}

describe('BaseLayout: documento', () => {
  it('<html lang> es el idioma y el head sale de los datos, con el tema y el theme-color', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props());
    expect(htmlDocument.documentElement.getAttribute('lang')).toBe('es');
    expect(htmlDocument.querySelector('head title')!.textContent).toBe('Inicio · Sitio');
    expect(htmlDocument.querySelector('head link[rel="canonical"]')).not.toBeNull();
    expect(htmlDocument.querySelectorAll('head meta[name="theme-color"]')).toHaveLength(2);
    const themeScript = [...htmlDocument.querySelectorAll('head script')].find((script) =>
      script.textContent?.includes('localStorage'),
    );
    expect(themeScript).toBeDefined();
  });

  it('`htmlAttrs` se suman a <html>', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props({ htmlAttrs: { 'data-x': '1' } }));
    expect(htmlDocument.documentElement.getAttribute('data-x')).toBe('1');
  });
});

describe('BaseLayout: cuerpo', () => {
  it('no impone ningún layout: sin `bodyClass`, <body> no lleva clase', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props());
    expect(htmlDocument.body.hasAttribute('class')).toBe(false);
  });

  it('`bodyClass` llega a <body> tal cual', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props({ bodyClass: 'grid min-h-dvh' }));
    expect(htmlDocument.body.getAttribute('class')).toBe('grid min-h-dvh');
  });
});

describe('BaseLayout: ranuras', () => {
  it('`head` va al final de <head>, el contenido en <body> y `scripts` al final de <body>', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props(), {
      head: '<meta name="extra" content="1">',
      default: '<main id="m">Hola</main>',
      scripts: '<script id="mine"></script>',
    });
    expect(htmlDocument.head.lastElementChild!.getAttribute('name')).toBe('extra');
    expect(htmlDocument.querySelector('body main#m')).not.toBeNull();
    expect(htmlDocument.body.lastElementChild!.getAttribute('id')).toBe('mine');
  });

  it('el contenido queda antes que `scripts`', async () => {
    const htmlDocument = await renderDocument(BaseLayout, props(), {
      default: '<main id="m"></main>',
      scripts: '<script id="mine"></script>',
    });
    const ids = [...htmlDocument.body.children].map((child) => child.getAttribute('id'));
    expect(ids.indexOf('m')).toBeLessThan(ids.indexOf('mine'));
  });
});

describe('BaseLayout: consentimiento', () => {
  const strings = stringsFor('es');

  it('sin gtmId no hay banner', async () => {
    const htmlDocument = await renderDocument(
      BaseLayout,
      props({ strings, privacyUrl: 'https://x.dev/privacy' }),
    );
    expect(htmlDocument.querySelector('[data-consent-banner]')).toBeNull();
  });

  it('con gtmId y privacyUrl: banner con el contenedor y enlace a la política', async () => {
    const htmlDocument = await renderDocument(
      BaseLayout,
      props({ strings, gtmId: 'GTM-ABC', privacyUrl: 'https://x.dev/privacy' }),
    );
    const banner = htmlDocument.querySelector('[data-consent-banner]')!;
    expect(banner.getAttribute('data-gtm-id')).toBe('GTM-ABC');
    expect(banner.querySelector('a[href="https://x.dev/privacy"]')).not.toBeNull();
  });

  it('con gtmId y sin privacyUrl falla nombrándola', async () => {
    await expect(renderDocument(BaseLayout, props({ strings, gtmId: 'GTM-ABC' }))).rejects.toThrow(
      /privacyUrl/,
    );
  });

  it('con gtmId y sin textos falla nombrándolos', async () => {
    await expect(
      renderDocument(BaseLayout, props({ gtmId: 'GTM-ABC', privacyUrl: '/p/' })),
    ).rejects.toThrow(/strings/);
  });
});
