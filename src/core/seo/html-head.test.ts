import { describe, expect, it } from 'vitest';
import { readHead } from './html-head';

const page = new URL('https://x.dev/repo/cv/');
const html = (head: string, body = '') =>
  `<!doctype html><html lang="es"><head>${head}</head><body>${body}</body></html>`;

describe('readHead: lo que dice la página de sí misma', () => {
  it('título, descripción e idioma, sin los espacios del marcado', () => {
    const facts = readHead(
      html('<title>\n  CV ·  Anthony </title><meta name="description" content=" Mi CV. ">'),
      page,
    );
    expect(facts).toMatchObject({ title: 'CV · Anthony', description: 'Mi CV.', lang: 'es' });
  });

  it('sin título, descripción ni idioma: no se inventan', () => {
    const facts = readHead('<html><head></head><body></body></html>', page);
    expect(facts.title).toBeUndefined();
    expect(facts.description).toBeUndefined();
    expect(facts.lang).toBeUndefined();
  });

  it('el nombre de la meta no distingue mayúsculas', () => {
    expect(readHead(html('<meta name="Description" content="x">'), page).description).toBe('x');
  });

  it('los textos de cada H1 del cuerpo, en orden', () => {
    expect(readHead(html('', '<h1> Uno </h1><section><h1>Dos</h1></section>'), page).h1).toEqual([
      'Uno',
      'Dos',
    ]);
  });
});

describe('readHead: indexación', () => {
  it('sin meta robots es indexable', () => {
    expect(readHead(html(''), page).noindex).toBe(false);
  });

  it.each(['noindex', 'NOINDEX, follow', 'nofollow,noindex', 'none'])(
    '«%s» la saca del índice',
    (content) => {
      expect(readHead(html(`<meta name="robots" content="${content}">`), page).noindex).toBe(true);
    },
  );

  it('«nofollow» solo no la saca del índice', () => {
    expect(readHead(html('<meta name="robots" content="nofollow">'), page).noindex).toBe(false);
  });

  it('también cuenta la meta que solo lee Google', () => {
    expect(readHead(html('<meta name="googlebot" content="noindex">'), page).noindex).toBe(true);
  });

  it('una meta robots fuera del <head> no cuenta', () => {
    expect(readHead(html('', '<meta name="robots" content="noindex">'), page).noindex).toBe(false);
  });
});

describe('readHead: canonical e idiomas', () => {
  it('el canonical, resuelto contra la URL de la página', () => {
    expect(readHead(html('<link rel="canonical" href="../cv/">'), page).canonical).toBe(
      'https://x.dev/repo/cv/',
    );
  });

  it('las alternativas por idioma, absolutas y en el orden del documento, con x-default', () => {
    const facts = readHead(
      html(
        '<link rel="alternate" hreflang="es" href="/repo/cv/">' +
          '<link rel="alternate" hreflang="en" href="https://x.dev/repo/en/cv/">' +
          '<link rel="alternate" hreflang="x-default" href="/repo/cv/">',
      ),
      page,
    );
    expect(facts.alternates).toEqual([
      { hreflang: 'es', href: 'https://x.dev/repo/cv/' },
      { hreflang: 'en', href: 'https://x.dev/repo/en/cv/' },
      { hreflang: 'x-default', href: 'https://x.dev/repo/cv/' },
    ]);
  });

  it('un rel con varios valores también vale', () => {
    expect(
      readHead(html('<link rel="alternate nofollow" hreflang="en" href="/en/">'), page).alternates,
    ).toEqual([{ hreflang: 'en', href: 'https://x.dev/en/' }]);
  });

  it('las alternativas sin hreflang (un feed RSS) o sin href no son idiomas', () => {
    const facts = readHead(
      html(
        '<link rel="alternate" type="application/rss+xml" href="/feed.xml">' +
          '<link rel="alternate" hreflang="en">',
      ),
      page,
    );
    expect(facts.alternates).toEqual([]);
  });
});
