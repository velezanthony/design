import { describe, expect, it } from 'vitest';

import type { HeadConfig } from '../../core/seo/head';
import { renderDocument } from '../../testing/render';
import Head from './Head.astro';

describe('Head', () => {
  const tags: HeadConfig[] = [
    { tag: 'title', attrs: {}, content: 'Guide · Docs' },
    { tag: 'meta', attrs: { name: 'description', content: 'Una "guía" & más' } },
    { tag: 'link', attrs: { rel: 'canonical', href: 'https://x.dev/repo/guide/' } },
    { tag: 'meta', attrs: { property: 'og:title', content: 'Guide' } },
  ];

  it('un <title> con el contenido', async () => {
    const doc = await renderDocument(Head, { head: tags });
    expect(doc.querySelector('title')!.textContent).toBe('Guide · Docs');
  });

  it('cada etiqueta de datos es una meta/link con sus atributos, sin transformar nada más', async () => {
    const doc = await renderDocument(Head, { head: tags });
    expect(doc.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      'Una "guía" & más',
    );
    expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
      'https://x.dev/repo/guide/',
    );
    expect(doc.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe('Guide');
  });

  it('mantiene el orden de los datos', async () => {
    const doc = await renderDocument(Head, { head: tags });
    const names = [...doc.querySelectorAll('title, meta, link')].map((el) => el.tagName);
    expect(names).toEqual(['TITLE', 'META', 'LINK', 'META']);
  });

  it('sin datos no pinta nada', async () => {
    const doc = await renderDocument(Head, { head: [] });
    expect(doc.querySelectorAll('title, meta, link')).toHaveLength(0);
  });
});
