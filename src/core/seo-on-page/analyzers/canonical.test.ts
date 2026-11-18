import { describe, expect, it } from 'vitest';
import type { SeoLocaleEntry } from '../tree/types';
import { analyzeCanonical } from './canonical';

const page = { slug: 'guide', locale: 'es', kind: 'native' as const, sourcePath: 'guide.es.md' };
const present = (locale: string, url: string): SeoLocaleEntry => ({
  locale,
  status: 'present',
  url,
});
const locales = [present('en', '/repo/guide/'), present('es', '/repo/es/guide/')];

describe('analyzeCanonical', () => {
  it('el canonical de cada versión es su propia URL: sin problemas', () => {
    expect(analyzeCanonical({ ...page, canonical: '/repo/es/guide/' }, locales)).toEqual([]);
  });

  it('apunta a otro idioma: aviso que dice a cuál', () => {
    const [issue] = analyzeCanonical({ ...page, canonical: '/repo/guide/' }, locales);
    expect(issue).toMatchObject({ kind: 'canonical-mismatch', severity: 'warning', slug: 'guide' });
    expect(issue!.message).toContain('«en»');
  });

  it('apunta a una URL que no es de ningún idioma: aviso también', () => {
    const [issue] = analyzeCanonical({ ...page, canonical: '/repo/otra/' }, locales);
    expect(issue!.kind).toBe('canonical-mismatch');
    expect(issue!.message).not.toContain('«en»');
  });

  it('sin URL propia en la lista de idiomas no hay contra qué comparar', () => {
    expect(
      analyzeCanonical({ ...page, canonical: '/x/' }, [present('en', '/repo/guide/')]),
    ).toEqual([]);
  });

  it('dice cómo arreglarlo, con el archivo', () => {
    const [issue] = analyzeCanonical({ ...page, canonical: '/repo/guide/' }, locales);
    expect(issue!.fix).toContain('guide.es.md');
  });
});
