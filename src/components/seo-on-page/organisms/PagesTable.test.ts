import { describe, expect, it } from 'vitest';
import type { PageRow } from '../../../core/seo-on-page/pages/listing/rows';
import { render, text } from '../../../testing/render';
import PagesTable from './PagesTable.astro';

function detail(locale: string, extra: object = {}) {
  return {
    locale,
    tone: 'ok' as const,
    present: true as const,
    href: `/i/?slug=guide&locale=${locale}`,
    title: `Guide ${locale} | Site`,
    titleLength: 20,
    descriptionSource: 'page' as const,
    descriptionLength: 90,
    issues: [],
    ...extra,
  };
}

function row(extra: Partial<PageRow> = {}): PageRow {
  return {
    slug: 'guide',
    title: 'Guide | Site',
    titleLength: 12,
    href: '/i/?slug=guide&locale=en',
    tags: [],
    locales: [detail('en'), detail('es')],
    issues: [],
    severity: undefined,
    ...extra,
  };
}

function issue(kind: 'no-h1' | 'duplicate-title', severity: 'error' | 'warning') {
  return {
    kind,
    severity,
    locales: ['en', 'es'],
    issue: { kind, severity, slug: 'guide', locale: 'en', message: 'm' },
  };
}

describe('PagesTable', () => {
  it('una fila por página: slug enlazado al inspector y su título', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row({ slug: 'guide/intro' })] });
    const link = htmlDocument.querySelector('tbody a')!;
    expect(text(link)).toBe('guide/intro');
    expect(link.getAttribute('href')).toBe('/i/?slug=guide&locale=en');
    expect(text(htmlDocument.querySelector('tbody'))).toContain('Guide | Site');
  });

  it('la portada (slug vacío) se muestra como «/»', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row({ slug: '' })] });
    expect(text(htmlDocument.querySelector('tbody a'))).toBe('/');
  });

  it('una insignia por idioma, la que no existe marcada como tal', async () => {
    const htmlDocument = await render(PagesTable, {
      rows: [
        row({
          locales: [detail('en'), { locale: 'es', tone: 'missing', present: false }],
        }),
      ],
    });
    const tr = htmlDocument.querySelector('tbody tr')!;
    expect(
      [...tr.querySelectorAll('[data-locale]')].map((badge) => badge.getAttribute('data-tone')),
    ).toEqual(['ok', 'missing']);
  });

  it('el título se mide contra el límite', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row({ titleLength: 72 })] });
    const meter = htmlDocument.querySelector('tbody tr [data-meter]')!;
    expect(meter.getAttribute('data-meter')).toBe('long');
    expect(text(meter)).toContain('72/60');
  });

  it('cada problema una vez, con los idiomas donde ocurre', async () => {
    const htmlDocument = await render(PagesTable, {
      rows: [row({ issues: [issue('no-h1', 'error'), issue('duplicate-title', 'warning')] })],
    });
    const first = htmlDocument.querySelector('tbody tr')!;
    expect(
      [...first.querySelectorAll('[data-severity]')].map((badge) =>
        badge.getAttribute('data-severity'),
      ),
    ).toEqual(['error', 'warning']);
    expect([...first.querySelectorAll('[data-where]')].map((warning) => text(warning))).toEqual([
      'EN ES',
      'EN ES',
    ]);
  });

  it('sin problemas propios dice «Nada propio»', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row()] });
    expect(text(htmlDocument.querySelector('tbody tr'))).toContain('Nada propio');
  });

  it('las etiquetas salen con su texto', async () => {
    const htmlDocument = await render(PagesTable, {
      rows: [
        row({ tags: [{ kind: 'home' }, { kind: 'only', locale: 'en' }, { kind: 'noindex' }] }),
      ],
    });
    expect([...htmlDocument.querySelectorAll('[data-tag]')].map((tag) => text(tag))).toEqual([
      'Portada',
      'Solo EN',
      'noindex',
    ]);
  });

  it('el detalle por idioma es un <details> (sin JavaScript) con una tarjeta por idioma', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row()] });
    const details = htmlDocument.querySelector('tbody details')!;
    expect(details.hasAttribute('open')).toBe(false);
    expect(
      [...details.querySelectorAll('[data-detail-locale]')].map((cell) =>
        cell.getAttribute('data-detail-locale'),
      ),
    ).toEqual(['en', 'es']);
    expect(details.querySelector('summary')!.classList.contains('cursor-pointer')).toBe(true);
  });

  it('el detalle enseña título, descripción y enlace al inspector de cada idioma', async () => {
    const htmlDocument = await render(PagesTable, { rows: [row()] });
    const card = htmlDocument.querySelector('[data-detail-locale="es"]')!;
    expect(text(card)).toContain('Guide es | Site');
    expect(text(card)).toContain('De la página');
    expect(card.querySelector('a')!.getAttribute('href')).toBe('/i/?slug=guide&locale=es');
  });

  it('en el detalle, un idioma que no existe lo dice en vez de enseñar campos', async () => {
    const htmlDocument = await render(PagesTable, {
      rows: [row({ locales: [detail('en'), { locale: 'es', tone: 'missing', present: false }] })],
    });
    const card = htmlDocument.querySelector('[data-detail-locale="es"]')!;
    expect(text(card)).toContain('No hay versión en ES');
    expect(card.querySelector('dl')).toBeNull();
  });

  it('el detalle enseña los problemas propios de ese idioma', async () => {
    const own = issue('no-h1', 'error').issue;
    const htmlDocument = await render(PagesTable, {
      rows: [row({ locales: [detail('en', { tone: 'error', issues: [own] }), detail('es')] })],
    });
    expect(
      htmlDocument.querySelector('[data-detail-locale="en"] [data-severity="error"]'),
    ).not.toBeNull();
    expect(htmlDocument.querySelector('[data-detail-locale="es"] [data-severity]')).toBeNull();
  });

  it('sin filas dice que ninguna página cumple los filtros', async () => {
    const htmlDocument = await render(PagesTable, { rows: [] });
    expect(htmlDocument.querySelector('table')).toBeNull();
    expect(text(htmlDocument)).toContain('Ninguna página');
  });
});
