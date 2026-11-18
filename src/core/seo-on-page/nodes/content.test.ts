import { describe, expect, it } from 'vitest';
import { contentFacts } from './content';

const own = { slug: 'guide', locale: 'en' };
function ref(slug: string, locale: string, anchor?: string) {
  return {
    file: 'guide.md',
    line: 1,
    slug,
    locale,
    ...(anchor && { anchor }),
  };
}
function image(src: string, alt: string) {
  return { file: 'guide.md', line: 1, src, alt };
}

describe('contentFacts', () => {
  it('cada página enlazada cuenta una vez, aunque se enlace varias veces o con anclas distintas', () => {
    const { links } = contentFacts(
      [ref('install', 'en'), ref('install', 'en', 'pasos'), ref('faq', 'en')],
      [],
      own,
    );
    expect(links).toEqual([
      { slug: 'install', locale: 'en' },
      { slug: 'faq', locale: 'en' },
    ]);
  });

  it('un enlace a la propia página (un ancla) no es un enlace a otra', () => {
    expect(contentFacts([ref('guide', 'en', 'intro')], [], own).links).toEqual([]);
  });

  it('la misma página en otro idioma sí es otro destino', () => {
    expect(contentFacts([ref('guide', 'es')], [], own).links).toEqual([
      { slug: 'guide', locale: 'es' },
    ]);
  });

  it('de cada imagen conserva solo lo que el análisis necesita: la ruta y el alt', () => {
    expect(contentFacts([], [image('img/a.png', 'captura')], own).images).toEqual([
      { src: 'img/a.png', alt: 'captura' },
    ]);
  });

  it('el alt con solo espacios es un alt vacío', () => {
    expect(contentFacts([], [image('a.png', '   ')], own).images).toEqual([
      { src: 'a.png', alt: '' },
    ]);
  });
});
