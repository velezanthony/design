import { describe, expect, it } from 'vitest';
import { IssueKind, IssueSeverity } from '../../core/seo-on-page/tree/types';
import { render, text } from '../../testing/render';
import Overview from './Overview.astro';

const zero = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;

const props = (extra: Record<string, unknown> = {}) => ({
  summary: {
    total: 10,
    withIssues: 4,
    withoutIssues: 6,
    byKind: { ...zero(Object.values(IssueKind)), 'no-h1': 3 },
    bySeverity: { ...zero(Object.values(IssueSeverity)), error: 3 },
  },
  hrefs: {
    pages: '/t/',
    kind: (kind: string) => `/t/?kind=${kind}`,
    severity: (severity: string) => `/t/?severity=${severity}`,
  },
  ...extra,
});

describe('Overview', () => {
  it('enseña el total y cuántas páginas tienen problemas', async () => {
    const doc = await render(Overview, props());
    expect(text(doc.querySelector('[data-stat="total"]'))).toContain('10');
    expect(text(doc.querySelector('[data-stat="with-issues"]'))).toContain('4');
    expect(text(doc.querySelector('[data-stat="without-issues"]'))).toContain('6');
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

  it('enlaza a la tabla completa', async () => {
    const doc = await render(Overview, props());
    expect(doc.querySelector('a[href="/t/"]')).not.toBeNull();
  });
});
