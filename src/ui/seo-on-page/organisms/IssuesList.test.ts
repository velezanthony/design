import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import IssuesList from './IssuesList.astro';

const base = {
  kind: 'no-h1',
  severity: 'error',
  slug: 'guide',
  locale: 'en',
  message: 'La página no tiene ningún H1.',
};

describe('IssuesList', () => {
  it('un duplicado enlaza al inspector de la página con la que choca', async () => {
    const issues = [
      {
        issue: {
          ...base,
          kind: 'duplicate-title',
          severity: 'warning',
          message: 'Otra página del mismo idioma tiene el mismo título.',
        },
        related: [{ slug: 'reference/guide', href: '/i/?slug=reference/guide&locale=en' }],
      },
    ];
    const doc = await render(IssuesList, { issues });
    const link = doc.querySelector<HTMLAnchorElement>('[data-issues] a[data-related]');
    expect(link?.getAttribute('href')).toBe('/i/?slug=reference/guide&locale=en');
    expect(text(link)).toContain('reference/guide');
  });

  it('lista los problemas de la página', async () => {
    const doc = await render(IssuesList, { issues: [{ issue: base, related: [] }] });
    expect(text(doc.querySelector('[data-issues]'))).toContain('La página no tiene ningún H1.');
  });

  it('cada problema enseña cómo arreglarlo bajo su mensaje', async () => {
    const issue = {
      ...base,
      fix: 'Acorta el título: `seo.title` en el frontmatter de `guide.md`.',
    };
    const doc = await render(IssuesList, { issues: [{ issue, related: [] }] });
    const fix = doc.querySelector('[data-issues] [data-fix]');
    expect(text(fix)).toContain('seo.title');
    expect(text(fix)).toContain('guide.md');
  });

  it('sin problemas lo dice', async () => {
    const doc = await render(IssuesList, { issues: [] });
    expect(text(doc.querySelector('[data-issues]'))).toContain('Sin problemas');
  });
});
