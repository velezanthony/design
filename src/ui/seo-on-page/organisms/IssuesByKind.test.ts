import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import IssuesByKind from './IssuesByKind.astro';

const rows = [
  { kind: 'no-h1', count: 3, href: '/t/?kind=no-h1' },
  { kind: 'title-too-long', count: 0, href: undefined },
];

describe('IssuesByKind', () => {
  it('cada tipo con incidencias enlaza a la tabla filtrada; los de cero no son enlace', async () => {
    const doc = await render(IssuesByKind, { rows });
    expect(text(doc.querySelector('a[href="/t/?kind=no-h1"]'))).toContain('3');
    expect(doc.querySelector('a[href="/t/?kind=title-too-long"]')).toBeNull();
    expect(doc.querySelector('[data-kind="title-too-long"]')).not.toBeNull();
  });
});
