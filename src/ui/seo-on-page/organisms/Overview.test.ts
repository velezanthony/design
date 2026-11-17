import { describe, expect, it } from 'vitest';
import { IssueKind, IssueSeverity } from '../../../core/seo-on-page/tree/types';
import { render, text } from '../../../testing/render';
import Overview from './Overview.astro';

const zero = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;

const props = (extra: Record<string, unknown> = {}) => ({
  summary: {
    total: 10,
    withProblems: 4,
    informativeOnly: 5,
    clean: 1,
    byKind: { ...zero(Object.values(IssueKind)), 'no-h1': 3 },
    bySeverity: { ...zero(Object.values(IssueSeverity)), error: 3 },
    schemas: {
      withSchemas: 7,
      withoutSchemas: 3,
      types: [
        { type: 'Organization', pages: 7 },
        { type: 'TechArticle', pages: 2 },
      ],
    },
  },
  hrefs: {
    pages: '/t/',
    all: '/t/?all',
    kind: (kind: string) => `/t/?kind=${kind}`,
    severity: (severity: string) => `/t/?severity=${severity}`,
  },
  ...extra,
});

describe('Overview', () => {
  it('enseña el total y separa con problemas, solo informativas y sin nada', async () => {
    const doc = await render(Overview, props());
    expect(text(doc.querySelector('[data-stat="total"]'))).toContain('10');
    expect(text(doc.querySelector('[data-stat="with-problems"]'))).toContain('4');
    expect(text(doc.querySelector('[data-stat="informative-only"]'))).toContain('5');
    expect(text(doc.querySelector('[data-stat="clean"]'))).toContain('1');
  });

  it('cada gravedad con incidencias enlaza a la tabla filtrada', async () => {
    const doc = await render(Overview, props());
    const link = doc.querySelector('a[href="/t/?severity=error"]')!;
    expect(text(link)).toContain('3');
  });

  it('cada tipo con incidencias enlaza a la tabla filtrada; los de cero no son enlace', async () => {
    const doc = await render(Overview, props());
    expect(text(doc.querySelector('a[href="/t/?kind=no-h1"]'))).toContain('3');
    expect(doc.querySelector('a[href="/t/?kind=title-too-long"]')).toBeNull();
    expect(doc.querySelector('[data-kind="title-too-long"]')).not.toBeNull();
  });

  it('enlaza a la tabla de problemas y a la de todas las páginas', async () => {
    const doc = await render(Overview, props());
    expect(text(doc.querySelector('a[href="/t/"]'))).toContain('problemas');
    expect(text(doc.querySelector('a[href="/t/?all"]'))).toContain('todas');
  });

  it('cuenta las páginas con y sin schema y lista los @type usados', async () => {
    const doc = await render(Overview, props());
    const block = text(doc.querySelector('[data-schemas]'));
    expect(block).toContain('7');
    expect(block).toContain('3');
    expect(block).toContain('Organization');
    expect(block).toContain('TechArticle');
  });

  it('sin ningún schema lo dice, sin inventar tipos', async () => {
    const empty = { withSchemas: 0, withoutSchemas: 10, types: [] };
    const base = props();
    const doc = await render(Overview, { ...base, summary: { ...base.summary, schemas: empty } });
    expect(text(doc.querySelector('[data-schemas]'))).toContain('Ninguna página declara schemas');
  });
});
