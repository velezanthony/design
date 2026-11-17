import { describe, expect, it } from 'vitest';
import { renderDocument, text } from '../../testing/render';
import SeoLayout from './SeoLayout.astro';

const page = () =>
  renderDocument(
    SeoLayout,
    {
      title: 'Resumen',
      siteName: 'Docs',
      hrefs: { overview: '/seo-on-page/', pages: '/seo-on-page/pages/', site: '/repo/' },
      active: 'overview',
    },
    { default: '<p>contenido</p>' },
  );

describe('SeoLayout', () => {
  it('no se indexa nunca: robots noindex', async () => {
    const doc = await page();
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
  });

  it('el título identifica el panel y la pantalla', async () => {
    const doc = await page();
    expect(doc.querySelector('title')!.textContent).toBe('Resumen · SEO on page');
  });

  it('avisa de que es una herramienta de desarrollo y enlaza a las pantallas y al sitio', async () => {
    const doc = await page();
    expect(text(doc)).toContain('solo en desarrollo');
    expect(doc.querySelector('a[href="/seo-on-page/pages/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/repo/"]')).not.toBeNull();
    expect(doc.querySelector('[aria-current="page"]')!.getAttribute('href')).toBe('/seo-on-page/');
  });

  it('pinta su contenido en <main>', async () => {
    const doc = await page();
    expect(text(doc.querySelector('main'))).toContain('contenido');
  });
});
