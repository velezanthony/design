import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';

// Un PNG de 2×1 (solo la cabecera: lo que lee el tamaño de la imagen).
const publicDir = mkdtempSync(join(tmpdir(), 'page-head-'));
const png = Buffer.concat([
  Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
  Buffer.from([0, 0, 0, 2, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
]);
writeFileSync(join(publicDir, 'og.png'), png);

vi.mock('virtual:@velezanthony/design/config', () => ({
  default: {
    ...resolveConfig({
      site: {
        name: 'Sitio',
        seo: { titleSuffix: 'Sitio', image: { src: '/og.png', alt: 'Sitio' } },
      },
      i18n: { locales: ['es', 'en'] },
    }),
    base: '/',
    siteUrl: 'https://x.dev',
    publicDir: pathToFileURL(`${publicDir}/`).href,
  },
}));

const { pageHead } = await import('./page-head');

describe('pageHead', () => {
  it('compone el <head> con la config del módulo virtual y el tamaño real de la imagen', async () => {
    const tags = await pageHead({
      title: 'Inicio',
      locale: 'es',
      url: '/',
      alternates: { es: '/', en: '/en/' },
    });
    expect(tags.find((tag) => tag.tag === 'title')?.content).toBe('Inicio | Sitio');
    const width = tags.find((tag) => tag.attrs.property === 'og:image:width');
    expect(width?.attrs.content).toBe('2');
    expect(tags.filter((tag) => tag.attrs.rel === 'canonical')[0]?.attrs.href).toBe(
      'https://x.dev/',
    );
  });

  it('lee también el tamaño de la imagen propia del bloque seo', async () => {
    const tags = await pageHead({
      title: 'Otra',
      locale: 'es',
      url: '/otra/',
      seo: { image: { src: '/og.png', alt: 'Otra' } },
    });
    expect(tags.some((tag) => tag.attrs.property === 'og:image:height')).toBe(true);
  });
});
