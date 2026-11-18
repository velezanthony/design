import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import CommonIssueNotice from './CommonIssueNotice.astro';

const notice = (extra: object = {}) =>
  render(CommonIssueNotice, {
    issue: { kind: 'description-inherited', severity: 'info', pages: 38, entries: 75, ...extra },
    overviewHref: '/o/',
  });

describe('CommonIssueNotice', () => {
  it('dice el tipo, a cuántas páginas y entradas afecta, y por qué no se repite', async () => {
    const doc = await notice();
    const aside = doc.querySelector('aside')!;
    expect(text(aside)).toContain('Descripción heredada del sitio');
    expect(text(aside)).toContain('Afecta a las 38 páginas (75 entradas), así que');
    expect(text(aside)).toContain('no se repite en cada fila');
  });

  it('enlaza a la vista general', async () => {
    expect((await notice()).querySelector('a')!.getAttribute('href')).toBe('/o/');
  });

  it('incluye cómo arreglarlo solo si hay un arreglo común, sin el formato de código', async () => {
    expect(text(await notice({ fix: 'Pon `seo.description` en el frontmatter.' }))).toContain(
      'Pon seo.description en el frontmatter.',
    );
    expect(text(await notice())).not.toContain('frontmatter');
  });

  it('concuerda en singular con una sola página', async () => {
    expect(text(await notice({ pages: 1, entries: 1 }))).toContain(
      'Afecta a la 1 página (1 entrada)',
    );
  });
});
