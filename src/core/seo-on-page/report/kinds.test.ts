import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { IssueKind, IssueSeverity, type Issue, type SeoPage } from '../tree/types';
import { currentValue, keyOf, restrictionFor } from './kinds';

function issue(kind: IssueKind, message = 'mensaje'): Issue {
  return {
    kind,
    severity: IssueSeverity.WARNING,
    slug: 'guide',
    locale: 'en',
    message,
  };
}

function withMeta(meta: Partial<SeoPage['meta']>): SeoPage {
  const base = seoPage();
  return { ...base, meta: { ...base.meta, ...meta } };
}

describe('keyOf', () => {
  it('el título y la descripción se declaran en `seo.*`', () => {
    const native = seoPage();
    expect(keyOf(IssueKind.TITLE_TOO_LONG, native)).toBe('seo.title');
    expect(keyOf(IssueKind.DUPLICATE_TITLE, native)).toBe('seo.title');
    expect(keyOf(IssueKind.DESCRIPTION_INHERITED, native)).toBe('seo.description');
    expect(keyOf(IssueKind.DUPLICATE_DESCRIPTION, native)).toBe('seo.description');
  });

  it('en una página externa la clave vive en `external[]` de docs.config.mjs', () => {
    const external = seoPage({ kind: 'external' });
    expect(keyOf(IssueKind.TITLE_TOO_SHORT, external)).toBe('content.external[].seo.title');
    expect(keyOf(IssueKind.TRANSLATION_POLICY_CONFLICT, external)).toBe(
      'content.external[].translations',
    );
  });

  it('los problemas del cuerpo (H1, saltos) y la traducción ausente no tienen clave', () => {
    const native = seoPage();
    expect(keyOf(IssueKind.NO_H1, native)).toBeUndefined();
    expect(keyOf(IssueKind.MULTIPLE_H1, native)).toBeUndefined();
    expect(keyOf(IssueKind.HEADING_SKIP, native)).toBeUndefined();
    expect(keyOf(IssueKind.TRANSLATION_MISSING, native)).toBeUndefined();
  });

  it('el conflicto de políticas se resuelve en `translations`', () => {
    expect(keyOf(IssueKind.TRANSLATION_POLICY_CONFLICT, seoPage())).toBe('translations');
  });
});

describe('currentValue', () => {
  it('el título trae su longitud y su ancho estimado', () => {
    const entry = withMeta({ title: 'Migrations | Site', titleLength: 17 });
    const value = currentValue(entry, issue(IssueKind.TITLE_TOO_SHORT));
    expect(value?.text).toMatch(/^«Migrations \| Site» \(17 car\., ≈\d+ px\)$/);
    expect(value?.raw).toBe('Migrations | Site');
  });

  it('una descripción heredada lo dice y cuántos caracteres tiene', () => {
    const entry = withMeta({
      description: 'Del sitio',
      descriptionSource: 'site',
      descriptionLength: 9,
    });
    const value = currentValue(entry, issue(IssueKind.DESCRIPTION_INHERITED));
    expect(value?.text).toBe('«Del sitio» (heredada del sitio, 9 car.)');
    expect(value?.raw).toBe('Del sitio');
  });

  it('sin descripción lo dice, y no hay valor en bruto', () => {
    const entry = withMeta({ description: undefined, descriptionSource: 'none' });
    const value = currentValue(entry, issue(IssueKind.DESCRIPTION_MISSING));
    expect(value?.text).toBe('sin descripción');
    expect(value?.raw).toBeUndefined();
  });

  it('una descripción propia lleva longitud y ancho estimado', () => {
    const entry = withMeta({ description: 'Una larga', descriptionLength: 9 });
    expect(currentValue(entry, issue(IssueKind.DESCRIPTION_TOO_SHORT))?.text).toMatch(
      /^«Una larga» \(9 car\., ≈\d+ px\)$/,
    );
  });

  it('varios H1 enseña cuántos y cuáles', () => {
    const entry = seoPage({
      headings: [
        { depth: 1, slug: 'a', text: 'Uno' },
        { depth: 2, slug: 'x', text: 'Medio' },
        { depth: 1, slug: 'b', text: 'Dos' },
      ],
    });
    expect(currentValue(entry, issue(IssueKind.MULTIPLE_H1))?.text).toBe('2 H1: «Uno», «Dos»');
  });

  it('sin H1 lo dice', () => {
    expect(currentValue(seoPage({ headings: [] }), issue(IssueKind.NO_H1))?.text).toBe('sin H1');
  });

  it('los demás tipos usan el mensaje del análisis', () => {
    const value = currentValue(seoPage(), issue(IssueKind.HEADING_SKIP, 'H2 salta a H4'));
    expect(value?.text).toBe('H2 salta a H4');
    expect(value?.raw).toBeUndefined();
  });
});

describe('restrictionFor', () => {
  it('los problemas de longitud dicen el rango en caracteres y píxeles, como recomendación', () => {
    expect(restrictionFor(IssueKind.DESCRIPTION_INHERITED)).toBe(
      '70–160 caracteres, ≈920 px (recomendación)',
    );
    expect(restrictionFor(IssueKind.TITLE_TOO_LONG)).toBe(
      '15–60 caracteres, ≈580 px (recomendación)',
    );
  });

  it('una traducción ausente avisa de que no se crea sin que lo pidan', () => {
    expect(restrictionFor(IssueKind.TRANSLATION_MISSING)).toMatch(/No crees una traducción/);
  });

  it('los duplicados no cambian el slug', () => {
    expect(restrictionFor(IssueKind.DUPLICATE_TITLE)).toMatch(/slug/);
  });

  it('sin límite ni advertencia no hay restricción', () => {
    expect(restrictionFor(IssueKind.NO_H1)).toBeUndefined();
  });
});
