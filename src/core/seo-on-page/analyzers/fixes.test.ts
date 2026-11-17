import { describe, expect, it } from 'vitest';
import { IssueKind } from '../tree/types';
import { fixFor, siblingPath } from './fixes';

const native = {
  slug: 'users/getting-started/migrations',
  locale: 'en',
  kind: 'native' as const,
  sourcePath: 'docs/users/getting-started/migrations.md',
};
const external = {
  slug: 'changelog',
  locale: 'en',
  kind: 'external' as const,
  sourcePath: 'CHANGELOG.md',
};

describe('siblingPath', () => {
  it('el idioma por defecto no lleva sufijo; los demás sí', () => {
    expect(siblingPath('docs/x.md', 'en', 'es', 'en')).toBe('docs/x.es.md');
    expect(siblingPath('docs/x.es.md', 'es', 'en', 'en')).toBe('docs/x.md');
    expect(siblingPath('docs/x.es.md', 'es', 'pt-BR', 'en')).toBe('docs/x.pt-BR.md');
  });
});

describe('fixFor: páginas nativas (frontmatter)', () => {
  it.each([
    [IssueKind.TITLE_TOO_LONG, 'seo.title'],
    [IssueKind.TITLE_TOO_SHORT, 'seo.title'],
    [IssueKind.DUPLICATE_TITLE, 'seo.title'],
    [IssueKind.DESCRIPTION_MISSING, 'seo.description'],
    [IssueKind.DESCRIPTION_INHERITED, 'seo.description'],
    [IssueKind.DESCRIPTION_TOO_SHORT, 'seo.description'],
    [IssueKind.DESCRIPTION_TOO_LONG, 'seo.description'],
    [IssueKind.DUPLICATE_DESCRIPTION, 'seo.description'],
  ])('%s: nombra %s y el archivo de la página', (kind, key) => {
    const fix = fixFor(kind, native);
    expect(fix).toContain(`\`${key}\``);
    expect(fix).toContain('frontmatter');
    expect(fix).toContain('docs/users/getting-started/migrations.md');
  });

  it('un duplicado nombra con qué páginas choca', () => {
    const fix = fixFor(IssueKind.DUPLICATE_TITLE, native, {
      related: [{ slug: 'users/other', locale: 'en' }],
    });
    expect(fix).toContain('users/other');
  });

  it('sin H1: empezar el archivo con «# Título»', () => {
    const fix = fixFor(IssueKind.NO_H1, native);
    expect(fix).toContain('# Título');
    expect(fix).toContain('docs/users/getting-started/migrations.md');
  });

  it('varios H1: dejar un solo # y bajar el resto', () => {
    const fix = fixFor(IssueKind.MULTIPLE_H1, native);
    expect(fix).toContain('un solo `#`');
    expect(fix).toContain('`##`');
  });

  it('salto de encabezados: dice qué encabezado y a qué nivel cambiarlo', () => {
    const fix = fixFor(IssueKind.HEADING_SKIP, native, {
      heading: { text: 'Deep', depth: 4, skipFrom: 2 },
    });
    expect(fix).toContain('«Deep»');
    expect(fix).toContain('H4');
    expect(fix).toContain('H3');
  });

  it('traducción ausente: crear el gemelo con su ruta exacta o declarar translations: omit', () => {
    const fix = fixFor(IssueKind.TRANSLATION_MISSING, native, {
      missingLocale: 'es',
      defaultLocale: 'en',
    });
    expect(fix).toContain('docs/users/getting-started/migrations.es.md');
    expect(fix).toContain('translations: omit');
    expect(fix).toContain('frontmatter de `docs/users/getting-started/migrations.md`');
  });

  it('la gemela de una página en español se calcula desde su propio archivo', () => {
    const fix = fixFor(
      IssueKind.TRANSLATION_MISSING,
      { ...native, locale: 'es', sourcePath: 'docs/a.es.md' },
      { missingLocale: 'pt-BR', defaultLocale: 'en' },
    );
    expect(fix).toContain('docs/a.pt-BR.md');
  });

  it('conflicto de políticas: nombrar los archivos del grupo', () => {
    const fix = fixFor(IssueKind.TRANSLATION_POLICY_CONFLICT, native, {
      groupLocales: ['en', 'es'],
      defaultLocale: 'en',
    });
    expect(fix).toContain('docs/users/getting-started/migrations.md');
    expect(fix).toContain('docs/users/getting-started/migrations.es.md');
    expect(fix).toContain('translations');
  });
});

describe('fixFor: páginas externas (docs.config.mjs)', () => {
  it.each([
    [IssueKind.TITLE_TOO_LONG, 'seo.title'],
    [IssueKind.DESCRIPTION_MISSING, 'seo.description'],
    [IssueKind.DUPLICATE_DESCRIPTION, 'seo.description'],
  ])('%s: apunta a external[].%s, no a un frontmatter', (kind, key) => {
    const fix = fixFor(kind, external);
    expect(fix).toContain(`external[].${key}`);
    expect(fix).toContain('docs.config.mjs');
    expect(fix).toContain('«changelog»');
    expect(fix).not.toContain('frontmatter');
  });

  it('traducción ausente: crear el archivo gemelo o declarar external[].translations', () => {
    const fix = fixFor(IssueKind.TRANSLATION_MISSING, external, {
      missingLocale: 'es',
      defaultLocale: 'en',
    });
    expect(fix).toContain('CHANGELOG.es.md');
    expect(fix).toContain('external[].translations');
    expect(fix).toContain('docs.config.mjs');
    expect(fix).not.toContain('frontmatter');
  });

  it('los encabezados se arreglan en el archivo, sea nativo o externo', () => {
    expect(fixFor(IssueKind.NO_H1, external)).toContain('CHANGELOG.md');
  });

  it('conflicto de políticas: una sola translations en la entrada', () => {
    const fix = fixFor(IssueKind.TRANSLATION_POLICY_CONFLICT, external, {
      groupLocales: ['en'],
      defaultLocale: 'en',
    });
    expect(fix).toContain('external[].translations');
  });
});

describe('fixFor', () => {
  it('hay texto para todos los tipos de problema', () => {
    for (const kind of Object.values(IssueKind)) {
      expect(fixFor(kind, native, { missingLocale: 'es', defaultLocale: 'en' })).not.toBe('');
    }
  });
});
