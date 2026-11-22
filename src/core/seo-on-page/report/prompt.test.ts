import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage, type SeoTree } from '../tree/types';
import { issuePrompt } from './prompt';

function issue(kind: IssueKind, extra: Partial<Issue> = {}): Issue {
  return {
    kind,
    severity: IssueSeverity.WARNING,
    slug: 'guide',
    locale: 'en',
    message: 'Otra página publica el mismo título.',
    fix: 'Dale un título distinto: `seo.title` en `guide.md`.',
    ...extra,
  };
}

const twin = seoPage({ slug: 'ref', sourcePath: 'ref.md' });
const own = seoPage({
  slug: 'guide',
  sourcePath: 'guide.md',
  meta: { ...seoPage().meta, title: 'Mismo | Site', titleLength: 12 },
});
const tree: SeoTree = { pages: [own, twin] };
const labels = { [IssueKind.DUPLICATE_TITLE]: 'Título duplicado' } as Record<IssueKind, string>;

function prompt(found: Issue, entry: SeoPage = own) {
  return issuePrompt({ site: 'SnakeORM', entry, issue: found, tree, kindLabels: labels });
}

describe('issuePrompt', () => {
  it('se explica solo: sitio, página, idioma, problema, gravedad y certeza', () => {
    const text = prompt(
      issue(IssueKind.DUPLICATE_TITLE, { related: [{ slug: 'ref', locale: 'en' }] }),
    );
    expect(text).toContain('«SnakeORM»');
    expect(text).toContain('`guide` (idioma en)');
    expect(text).toContain('Título duplicado (aviso, regla)');
  });

  it('dice el fichero, la clave y el valor actual', () => {
    const text = prompt(issue(IssueKind.DUPLICATE_TITLE));
    expect(text).toContain('Fichero: `guide.md`');
    expect(text).toContain('Clave: `seo.title`');
    expect(text).toContain('Valor actual: «Mismo | Site» (12 car.');
  });

  it('trae el arreglo del análisis tal cual', () => {
    expect(prompt(issue(IssueKind.DUPLICATE_TITLE))).toContain(
      'Qué hacer: Dale un título distinto: `seo.title` en `guide.md`.',
    );
  });

  it('sin arreglo del análisis usa el general del tipo', () => {
    const text = prompt(issue(IssueKind.DUPLICATE_TITLE, { fix: undefined }));
    expect(text).toContain('Qué hacer: Dale a cada página un título que la distinga');
  });

  it('con la página con la que choca, dice cuál y su fichero', () => {
    const text = prompt(
      issue(IssueKind.DUPLICATE_TITLE, { related: [{ slug: 'ref', locale: 'en' }] }),
    );
    expect(text).toContain('Choca con: `ref` (`ref.md`)');
  });

  it('una página relacionada que no está en el árbol se nombra sin fichero', () => {
    const text = prompt(
      issue(IssueKind.DUPLICATE_TITLE, { related: [{ slug: 'gone', locale: 'en' }] }),
    );
    expect(text).toContain('Choca con: `gone`');
    expect(text).not.toContain('(``)');
  });

  it('la longitud es una recomendación y lo dice', () => {
    const text = prompt(issue(IssueKind.TITLE_TOO_SHORT));
    expect(text).toContain('Restricción: 15–60 caracteres, ≈580 px (recomendación)');
    expect(text).toContain('heurística');
  });

  it('cómo verificar y qué no tocar van siempre', () => {
    const text = prompt(
      issue(IssueKind.DUPLICATE_TITLE, { related: [{ slug: 'ref', locale: 'en' }] }),
    );
    expect(text).toContain('Verificar: Este aviso desaparece aquí y en «ref».');
    expect(text).toContain('No cambies el slug, la URL ni el canonical.');
  });

  it('sin clave (un problema del cuerpo) no inventa una', () => {
    const text = prompt(issue(IssueKind.NO_H1, { message: 'No hay H1.' }));
    expect(text).not.toContain('Clave:');
  });

  it('una página externa nombra su clave bajo `external[]`', () => {
    const external = seoPage({ slug: 'changelog', kind: 'external', sourcePath: 'CHANGELOG.md' });
    expect(prompt(issue(IssueKind.TITLE_TOO_SHORT), external)).toContain(
      'Clave: `content.external[].seo.title`',
    );
  });
});
