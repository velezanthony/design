import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import SiteFilesCard from './SiteFilesCard.astro';

const files = [
  { id: 'sitemap', path: '/sitemap.xml', state: 'generated', href: '/sitemap.xml', urls: 75 },
  { id: 'robots', path: '/robots.txt', state: 'absent' },
  { id: 'privacy', path: '/privacy', state: 'not-applicable' },
  { id: 'pagefind', path: '/pagefind/', state: 'build-only' },
];

describe('SiteFilesCard', () => {
  it('el que se puede abrir lleva su enlace; el que no, una etiqueta', async () => {
    const doc = await render(SiteFilesCard, { files, locales: ['en', 'es'] });
    expect(doc.querySelector('[data-file="sitemap"] a')!.getAttribute('href')).toBe('/sitemap.xml');
    expect(doc.querySelector('[data-file="robots"] a')).toBeNull();
    expect(text(doc.querySelector('[data-file="robots"]'))).toContain('opcional');
  });

  it('un fichero opcional ausente no es un fallo: lo dice «No hay», no un aviso', async () => {
    const doc = await render(SiteFilesCard, { files, locales: ['en', 'es'] });
    const robots = text(doc.querySelector('[data-file="robots"]'));
    expect(robots).toContain('No hay');
    expect(robots).toContain('Opcional');
  });

  it('el sitemap dice cuántas URLs lleva y en qué idiomas', async () => {
    const doc = await render(SiteFilesCard, { files, locales: ['en', 'es'] });
    expect(text(doc.querySelector('[data-file="sitemap"]'))).toContain('75 URLs (en + es)');
  });

  it('lo que no aplica o solo existe en la build se dice con esas palabras', async () => {
    const doc = await render(SiteFilesCard, { files, locales: ['en', 'es'] });
    expect(text(doc.querySelector('[data-file="privacy"]'))).toContain('No aplica');
    expect(text(doc.querySelector('[data-file="pagefind"]'))).toContain('Solo en la build');
  });
});
