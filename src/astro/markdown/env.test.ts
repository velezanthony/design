import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, externalFileURL, nonDocFileURL, project } from '../../testing/markdown';
import { createMarkdownEnv, fileLabel, localeOf, stringsOf } from './env';

const env = createMarkdownEnv(
  resolveConfig({
    site: { name: 'x' },
    i18n: { locales: ['en', 'es'], ui: { es: { 'admonition.note': 'Ojo' } } },
    content: { external: [{ slug: 'changelog', file: 'CHANGELOG.md' }] },
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

  it('fuera de la documentación, sin sufijo, lee el idioma de la carpeta más cercana', () => {
    expect(localeOf(env, nonDocFileURL('projects/es/design.md'))).toBe('es');
    expect(localeOf(env, nonDocFileURL('projects/en/design.md'))).toBe('en');
    expect(localeOf(env, nonDocFileURL('es/projects/design.en.md'))).toBe('en');
    expect(localeOf(env, nonDocFileURL('projects/design.md'))).toBe('en');
  });

  it('en la documentación la carpeta no cuenta: solo el sufijo', () => {
    expect(localeOf(env, docFileURL('es/guide.md'))).toBe('en');
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

describe('con `content` fuera del proyecto', () => {
  const outside = createMarkdownEnv(
    resolveConfig({ site: { name: 'x' }, content: { dir: '../docs' } }),
    project,
  );

  it('el ámbito de los plugins es esa carpeta', () => {
    expect(outside.scope.docsPrefix).toBe('file:///docs/');
  });

  it('fileLabel da la ruta respecto a la raíz del proyecto, también con `..`', () => {
    expect(fileLabel(outside, new URL('file:///docs/users/guia.md'))).toBe('../docs/users/guia.md');
    expect(fileLabel(outside, docFileURL('a.md'))).toBe('src/content/docs/a.md');
    expect(fileLabel(outside, externalFileURL('../CHANGELOG.md'))).toBe('../CHANGELOG.md');
  });
});
