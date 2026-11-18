import { describe, expect, it } from 'vitest';
import { render, text } from '../../../../testing/render';
import Translations from './Translations.astro';

const none = { titleLength: false, descriptionLength: false, descriptionSource: false };
function present(locale: string, overrides = {}) {
  return {
    state: 'present',
    locale,
    tone: 'ok',
    current: locale === 'en',
    href: locale === 'en' ? undefined : `/i/?slug=guide&locale=${locale}`,
    title: `Guide ${locale}`,
    titleLength: 20,
    titleClass: 'ok',
    description: `Desc ${locale}`,
    descriptionLength: 93,
    descriptionClass: 'ok',
    descriptionSource: 'page',
    issues: [],
    differs: none,
    ...overrides,
  };
}

describe('Translations', () => {
  it('una columna por idioma y una fila por campo', async () => {
    const htmlDocument = await render(Translations, {
      translations: { columns: [present('en'), present('es')] },
    });
    expect(
      [...htmlDocument.querySelectorAll('thead [data-col]')].map((column) =>
        column.getAttribute('data-col'),
      ),
    ).toEqual(['en', 'es']);
    expect(
      [...htmlDocument.querySelectorAll('tbody tr')].map((row) => row.getAttribute('data-row')),
    ).toEqual([
      'title',
      'titleLength',
      'description',
      'descriptionLength',
      'descriptionSource',
      'issues',
    ]);
  });

  it('marca como «difiere» solo la celda que se aparta, con su porqué', async () => {
    const htmlDocument = await render(Translations, {
      translations: {
        columns: [
          present('en'),
          present('es', {
            descriptionLength: 70,
            descriptionClass: 'edge',
            differs: { ...none, descriptionLength: true },
          }),
        ],
      },
    });
    const marked = htmlDocument.querySelectorAll('[data-differs]');
    expect(marked).toHaveLength(1);
    expect(text(marked[0]!)).toBe('70 difiere (al límite)');
  });

  it('el idioma ausente dice su política en lugar de datos', async () => {
    const htmlDocument = await render(Translations, {
      translations: {
        columns: [
          present('en'),
          {
            state: 'missing',
            locale: 'fr',
            current: false,
            policy: 'link',
            declared: false,
            tone: 'missing',
          },
        ],
      },
    });
    expect(text(htmlDocument.querySelector('[data-row="title"]'))).toContain(
      'Falta · política link (sin declarar)',
    );
  });

  it('enlaza al inspector de los otros idiomas y no al propio', async () => {
    const htmlDocument = await render(Translations, {
      translations: { columns: [present('en'), present('es')] },
    });
    expect(htmlDocument.querySelector('[data-col="en"] a')).toBeNull();
    expect(htmlDocument.querySelector('[data-col="es"] a')!.getAttribute('href')).toBe(
      '/i/?slug=guide&locale=es',
    );
  });
});
