import { describe, expect, it } from 'vitest';

import type { HeadConfig } from '../../core/seo/head';
import { renderDocument } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import NotFoundLayout from './NotFoundLayout.astro';

const head: HeadConfig[] = [
  { tag: 'title', attrs: {}, content: 'Page not found' },
  { tag: 'meta', attrs: { name: 'robots', content: 'noindex' } },
];

const es = {
  lang: 'es',
  title: 'Página no encontrada',
  homeHref: '/repo/es/',
  strings: stringsFor('es'),
};

const props = (extra: Record<string, unknown> = {}) => ({
  lang: 'en',
  head,
  siteName: 'Docs',
  homeHref: '/repo/',
  strings: stringsFor('en'),
  baseUrl: '/repo/',
  year: 2026,
  ...extra,
});

const multi = props({
  others: [es],
  swap: { base: '/repo/', locales: ['en', 'es'], defaultLocale: 'en' },
});

describe('NotFoundLayout: un solo idioma (también /<locale>/404/)', () => {
  it('pinta su idioma directamente: lang, noindex, main fuera del índice', async () => {
    const doc = await renderDocument(NotFoundLayout, props());
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('main')!.hasAttribute('data-pagefind-ignore')).toBe(true);
    expect(doc.querySelectorAll('[data-pagefind-body]')).toHaveLength(0);
    expect(doc.querySelector('main h1')!.textContent).toBe('Page not found');
  });

  it('con salto, cabecera, buscador y enlace a la portada', async () => {
    const doc = await renderDocument(NotFoundLayout, props());
    expect(doc.body.querySelector('a, button')!.getAttribute('href')).toBe('#main-content');
    expect(doc.querySelectorAll('header')).toHaveLength(1);
    expect(doc.querySelector('[data-search]')).not.toBeNull();
    expect(doc.querySelector('main a[href="/repo/"]')).not.toBeNull();
  });

  it('sin otros idiomas no hay plantillas, ni nf-pending, ni script de sustitución', async () => {
    const doc = await renderDocument(NotFoundLayout, props());
    expect(doc.querySelectorAll('template')).toHaveLength(0);
    const inline = [...doc.querySelectorAll('head script')].map((s) => s.textContent ?? '');
    expect(inline.some((code) => code.includes('nf-pending'))).toBe(false);
  });

  it('consentimiento solo con gtmId', async () => {
    expect(
      (await renderDocument(NotFoundLayout, props())).querySelector('[data-consent-banner]'),
    ).toBeNull();
    const doc = await renderDocument(
      NotFoundLayout,
      props({ gtmId: 'GTM-1', privacyUrl: 'https://x.dev/p' }),
    );
    expect(doc.querySelector('[data-consent-banner]')).not.toBeNull();
  });
});

describe('NotFoundLayout: /404.html con otros idiomas', () => {
  it('el idioma por defecto se ve sin JavaScript', async () => {
    const doc = await renderDocument(NotFoundLayout, multi);
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelector('body > header, body header')).not.toBeNull();
    expect(doc.querySelector('main h1')!.textContent).toBe('Page not found');
  });

  it('una <template data-locale> por idioma con su título y el cuerpo en ese idioma', async () => {
    const doc = await renderDocument(NotFoundLayout, multi);
    const templates = [...doc.querySelectorAll('template[data-locale]')];
    expect(templates.map((t) => t.getAttribute('data-locale'))).toEqual(['es']);
    const template = templates[0] as unknown as {
      content: DocumentFragment;
      getAttribute(n: string): string;
    };
    expect(template.getAttribute('data-title')).toBe('Página no encontrada');
    expect(template.content.querySelector('main h1')!.textContent).toBe('Página no encontrada');
    expect(template.content.querySelector('a[href="/repo/es/"]')).not.toBeNull();
    expect(template.content.querySelector('html, body')).toBeNull();
  });

  it('las plantillas no contienen <script>', async () => {
    const doc = await renderDocument(NotFoundLayout, multi);
    for (const template of doc.querySelectorAll('template')) {
      const content = (template as unknown as { content: DocumentFragment }).content;
      expect(content.querySelector('script')).toBeNull();
    }
  });

  it('un script en línea previo al pintado pone html.nf-pending y el CSS oculta <main>', async () => {
    const doc = await renderDocument(NotFoundLayout, multi);
    const inline = [...doc.querySelectorAll('head script')].find((s) =>
      s.textContent?.includes('nf-pending'),
    );
    expect(inline).toBeDefined();
    expect(inline!.getAttribute('type')).not.toBe('module');
    const css = [...doc.querySelectorAll('head style')].map((s) => s.textContent).join('');
    expect(css).toMatch(/nf-pending[^{]*main[^{]*\{[^}]*visibility:\s*hidden/);
  });

  it('el script módulo de sustitución recibe base, idiomas y el idioma por defecto', async () => {
    const doc = await renderDocument(NotFoundLayout, multi);
    const data = doc.documentElement;
    expect(data.getAttribute('data-nf-base')).toBe('/repo/');
    expect(data.getAttribute('data-nf-locales')).toBe('en,es');
    expect(data.getAttribute('data-nf-default')).toBe('en');
    expect(doc.querySelectorAll('script[type="module"]').length).toBeGreaterThan(0);
  });
});
