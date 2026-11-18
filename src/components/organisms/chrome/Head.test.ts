import { describe, expect, it } from 'vitest';

import type { HeadConfig } from '../../../core/seo/head';
import { renderDocument } from '../../../testing/render';
import Head from './Head.astro';

describe('Head', () => {
  const tags: HeadConfig[] = [
    { tag: 'title', attrs: {}, content: 'Guide · Docs' },
    { tag: 'meta', attrs: { name: 'description', content: 'Una "guía" & más' } },
    { tag: 'link', attrs: { rel: 'canonical', href: 'https://x.dev/repo/guide/' } },
    { tag: 'meta', attrs: { property: 'og:title', content: 'Guide' } },
  ];

  it('un <title> con el contenido', async () => {
    const htmlDocument = await renderDocument(Head, { head: tags });
    expect(htmlDocument.querySelector('title')!.textContent).toBe('Guide · Docs');
  });

  it('cada etiqueta de datos es una meta/link con sus atributos, sin transformar nada más', async () => {
    const htmlDocument = await renderDocument(Head, { head: tags });
    expect(htmlDocument.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'Una "guía" & más',
    );
    expect(htmlDocument.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://x.dev/repo/guide/',
    );
    expect(htmlDocument.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe(
      'Guide',
    );
  });

  it('mantiene el orden de los datos', async () => {
    const htmlDocument = await renderDocument(Head, { head: tags });
    const names = [...htmlDocument.querySelectorAll('title, meta, link')].map(
      (element) => element.tagName,
    );
    expect(names).toEqual(['TITLE', 'META', 'LINK', 'META']);
  });

  it('sin datos no pinta nada', async () => {
    const htmlDocument = await renderDocument(Head, { head: [] });
    expect(htmlDocument.querySelectorAll('title, meta, link')).toHaveLength(0);
  });

  it('un <script> JSON-LD lleva su contenido tal cual, sin escapar a HTML ni dejarlo crudo', async () => {
    const content = String.raw`{"name":"\u003c/script\u003e & \u0026"}`;
    const htmlDocument = await renderDocument(Head, {
      head: [{ tag: 'script', attrs: { type: 'application/ld+json' }, content }],
    });
    const script = htmlDocument.querySelector('script[type="application/ld+json"]')!;
    expect(script.textContent).toBe(content);
    expect(htmlDocument.querySelectorAll('script')).toHaveLength(1);
  });
});
