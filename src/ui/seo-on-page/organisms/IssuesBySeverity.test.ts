import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import IssuesBySeverity from './IssuesBySeverity.astro';

const rows = [
  { severity: 'error', count: 3, href: '/t/?severity=error' },
  { severity: 'warning', count: 0, href: undefined },
  { severity: 'info', count: 0, href: undefined },
];

describe('IssuesBySeverity', () => {
  it('cada gravedad con incidencias enlaza a la tabla filtrada', async () => {
    const doc = await render(IssuesBySeverity, { rows });
    expect(text(doc.querySelector('a[href="/t/?severity=error"]'))).toContain('3');
  });

  it('las de cero no son enlace pero se enseñan', async () => {
    const doc = await render(IssuesBySeverity, { rows });
    expect(doc.querySelector('[data-severity="warning"] a')).toBeNull();
    expect(text(doc.querySelector('[data-severity="warning"]'))).toContain('0');
  });
});
