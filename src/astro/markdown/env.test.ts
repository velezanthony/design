import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, externalFileURL, project } from '../../testing/markdown';
import { createMarkdownEnv, localeOf, stringsOf } from './env';

const env = createMarkdownEnv(
  resolveConfig({
    name: 'x',
    locales: ['en', 'es'],
    external: [{ slug: 'changelog', file: 'CHANGELOG.md' }],
    ui: { es: { 'admonition.note': 'Ojo' } },
  }),
  project,
);

describe('localeOf', () => {
  it('lee el idioma del sufijo del archivo, nativo o external', () => {
    expect(localeOf(env, docFileURL('guide.es.md'))).toBe('es');
    expect(localeOf(env, docFileURL('a/guide.md'))).toBe('en');
    expect(localeOf(env, externalFileURL('CHANGELOG.es.md'))).toBe('es');
    expect(localeOf(env, externalFileURL('CHANGELOG.md'))).toBe('en');
  });

  it('un sufijo no declarado, o la ausencia de fileURL, cae al idioma por defecto', () => {
    expect(localeOf(env, docFileURL('guide.fr.md'))).toBe('en');
    expect(localeOf(env, undefined)).toBe('en');
  });
});

describe('stringsOf', () => {
  it('trae el catálogo del idioma con los overrides del consumidor', () => {
    expect(stringsOf(env, docFileURL('a.es.md'))['admonition.note']).toBe('Ojo');
    expect(stringsOf(env, docFileURL('a.md'))['admonition.note']).toBe('Note');
  });
});
