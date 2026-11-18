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

  it('los encabezados del cuerpo en orden, con su nivel, su id y su texto', () => {
    const body =
      '<h1 id="cv"> Mi CV </h1><section><h2 id="exp">Experiencia</h2><h4>Sin id</h4></section>';
    expect(readHead(html('', body), page).headings).toEqual([
      { depth: 1, slug: 'cv', text: 'Mi CV' },
      { depth: 2, slug: 'exp', text: 'Experiencia' },
      { depth: 4, slug: '', text: 'Sin id' },
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

describe('readHead: lo que se comparte en redes', () => {
  it('título, descripción e imagen Open Graph, con la imagen absoluta y su tamaño', () => {
    const facts = readHead(
      html(
        '<meta property="og:title" content="CV">' +
          '<meta property="og:description" content="Mi CV">' +
          '<meta property="og:image" content="/og.png">' +
          '<meta property="og:image:alt" content="Retrato">' +
          '<meta property="og:image:width" content="1200">' +
          '<meta property="og:image:height" content="630">',
      ),
      page,
    );
    expect(facts.og).toEqual({
      title: 'CV',
      description: 'Mi CV',
      image: { src: 'https://x.dev/og.png', alt: 'Retrato', width: 1200, height: 630 },
    });
  });

  it('sin Open Graph no hay nada que contar', () => {
    expect(readHead(html(''), page).og).toEqual({});
  });

  it('un tamaño que no es un número no se inventa', () => {
    const facts = readHead(
      html(
        '<meta property="og:image" content="/og.png"><meta property="og:image:width" content="ancho">',
      ),
      page,
    );
    expect(facts.og.image).toEqual({ src: 'https://x.dev/og.png', alt: '' });
  });

  it('un tamaño negativo o cero tampoco', () => {
    const facts = readHead(
      html(
        '<meta property="og:image" content="/og.png">' +
          '<meta property="og:image:width" content="-1200"><meta property="og:image:height" content="0">',
      ),
      page,
    );
    expect(facts.og.image).toEqual({ src: 'https://x.dev/og.png', alt: '' });
  });
});

describe('readHead: datos estructurados', () => {
  it('cada bloque JSON-LD del <head>, ya interpretado', () => {
    const facts = readHead(
      html(
        '<script type="application/ld+json">{"@type":"Person","name":"A"}</script>' +
          '<script type="application/ld+json">[{"@type":"WebSite"}]</script>',
      ),
      page,
    );
    expect(facts.jsonLd).toEqual([{ '@type': 'Person', name: 'A' }, [{ '@type': 'WebSite' }]]);
  });

  it('un bloque roto se ignora: no tumba la lectura del resto', () => {
    const facts = readHead(
      html(
        '<script type="application/ld+json">{roto</script>' +
          '<script type="application/ld+json">{"@type":"Person"}</script>',
      ),
      page,
    );
    expect(facts.jsonLd).toEqual([{ '@type': 'Person' }]);
  });
});
