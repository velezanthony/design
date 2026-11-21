import { describe, expect, it } from 'vitest';
import { DocsError } from '../errors';
import { parseFrontmatter, splitFrontmatter } from './frontmatter';

describe('splitFrontmatter', () => {
  it('separa el bloque YAML del cuerpo y conserva el número de líneas', () => {
    const raw = '---\ntitle: Hola\norder: 2\n---\n# Hola\n\ntexto';
    const result = splitFrontmatter(raw);
    expect(result.yaml).toBe('title: Hola\norder: 2');
    // Las 4 líneas del bloque quedan en blanco: el enlace roto de la línea 7 sigue siendo la 7.
    expect(result.body).toBe('\n\n\n\n# Hola\n\ntexto');
    expect(result.body.split('\n')).toHaveLength(raw.split('\n').length);
  });

  it('sin frontmatter devuelve el cuerpo intacto', () => {
    expect(splitFrontmatter('# Hola\n')).toEqual({ yaml: undefined, body: '# Hola\n' });
  });

  it('un bloque abierto con `---` en la primera línea y sin cierre se señala como sin cerrar', () => {
    const raw = '---\n\ntexto sin cierre';
    expect(splitFrontmatter(raw)).toEqual({ yaml: undefined, body: raw, unclosed: true });
  });

  it('un bloque bien cerrado y un archivo sin frontmatter no están sin cerrar', () => {
    expect(splitFrontmatter('---\ntitle: X\n---\n').unclosed).toBeUndefined();
    expect(splitFrontmatter('# X\n').unclosed).toBeUndefined();
  });

  it('acepta CRLF y bloque vacío', () => {
    expect(splitFrontmatter('---\r\ntitle: X\r\n---\r\n# X').yaml).toBe('title: X');
    expect(splitFrontmatter('---\n---\n# X').yaml).toBe('');
  });

  it('un `---` que no está en la primera línea no abre frontmatter', () => {
    const raw = '\n---\ntitle: X\n---\n# X';
    expect(splitFrontmatter(raw).yaml).toBeUndefined();
  });
});

describe('parseFrontmatter', () => {
  it('acepta title, order, seo y translations', () => {
    const { frontmatter, errors } = parseFrontmatter(
      {
        title: 'Hola',
        order: 3,
        seo: { title: 'SEO', noindex: true, image: { src: '/og.png' } },
        translations: 'omit',
      },
      'guide.md',
    );
    expect(errors).toEqual([]);
    expect(frontmatter).toEqual({
      title: 'Hola',
      order: 3,
      seo: { title: 'SEO', noindex: true, image: { src: '/og.png' } },
      translations: 'omit',
    });
  });

  it('sin datos (frontmatter vacío o ausente) es un objeto vacío', () => {
    expect(parseFrontmatter(undefined, 'a.md')).toEqual({ frontmatter: {}, errors: [] });
    expect(parseFrontmatter(null, 'a.md')).toEqual({ frontmatter: {}, errors: [] });
  });

  it('ignora claves ajenas (otras herramientas escriben las suyas)', () => {
    const { frontmatter, errors } = parseFrontmatter({ title: 'X', draft: true }, 'a.md');
    expect(errors).toEqual([]);
    expect(frontmatter).toEqual({ title: 'X' });
  });

  it('un seo inválido nombra archivo y campo', () => {
    const { errors } = parseFrontmatter({ seo: { image: { src: 'og.png' } } }, 'guide.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(DocsError);
    expect(errors[0]?.file).toBe('guide.md');
    expect(errors[0]?.message).toContain('seo.image.src');
  });

  it('una clave desconocida dentro de seo se nombra con su ruta', () => {
    const { errors } = parseFrontmatter({ seo: { titel: 'x' } }, 'guide.md');
    expect(errors[0]?.message).toContain('seo.titel');
  });

  it('translations inválido lista los valores permitidos', () => {
    const { errors } = parseFrontmatter({ translations: 'ocultar' }, 'guide.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('translations');
    expect(errors[0]?.message).toMatch(/link.*omit.*fallback/s);
  });

  it('agrega todos los fallos, no solo el primero', () => {
    const { errors } = parseFrontmatter({ order: 'uno', translations: 'x' }, 'a.md');
    expect(errors).toHaveLength(2);
  });

  it('algo que no es un mapa falla', () => {
    const { errors } = parseFrontmatter('hola', 'a.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.file).toBe('a.md');
  });
});

describe('parseFrontmatter: index', () => {
  function messages(index: unknown, file = 'articulos/git.md') {
    return parseFrontmatter({ index }, file).errors.map((error) => error.message);
  }

  it('una página normal: resumen, imagen (ruta o false) y texto alternativo', () => {
    const { frontmatter, errors } = parseFrontmatter(
      { index: { summary: 'Corto.', image: './portada.png', imageAlt: 'Un gato' } },
      'articulos/git.md',
    );
    expect(errors).toEqual([]);
    expect(frontmatter.index).toEqual({
      summary: 'Corto.',
      image: './portada.png',
      imageAlt: 'Un gato',
    });
    expect(messages({ image: false })).toEqual([]);
    expect(messages({ image: '/portadas/git.png' })).toEqual([]);
    expect(messages({ image: 'portada.png' })).toEqual([]);
  });

  it('un _index.md: disposición, tamaño de página, opciones por página y política de portadas', () => {
    const index = { layout: 'cards', pageSize: 6, perPageOptions: [6, 12], image: false };
    for (const file of ['articulos/_index.md', 'articulos/_index.en.md', '_index.md']) {
      expect(parseFrontmatter({ index }, file)).toEqual({ frontmatter: { index }, errors: [] });
    }
  });

  it('`layout` y `pageSize` solo en un _index.md: un index.md es una página normal', () => {
    expect(messages({ layout: 'list' }, 'articulos/index.md').join('\n')).toContain('index.layout');
    expect(messages({ pageSize: 4 }).join('\n')).toContain('index.pageSize');
    expect(messages({ perPageOptions: [4] }).join('\n')).toContain('index.perPageOptions');
  });

  it('en un _index.md `image` es la política del listado: true o false, no una ruta', () => {
    expect(messages({ image: './x.png' }, 'a/_index.md').join('\n')).toContain('index.image');
    expect(messages({ image: true }, 'a/_index.md')).toEqual([]);
  });

  it('fuera de un _index.md `image: true` no significa nada', () => {
    expect(messages({ image: true }).join('\n')).toContain('index.image');
  });

  it.each(['https://x.dev/a.png', '//x.dev/a.png', 'data:image/png;base64,AA', ''])(
    'una imagen «%s» que no es una ruta local falla',
    (image) => {
      expect(messages({ image }).join('\n')).toContain('index.image');
    },
  );

  it('`perPageOptions` son enteros positivos y al menos uno', () => {
    expect(messages({ perPageOptions: [0] }, 'a/_index.md').join('\n')).toContain(
      'index.perPageOptions',
    );
    expect(messages({ perPageOptions: [] }, 'a/_index.md').join('\n')).toContain(
      'index.perPageOptions',
    );
  });

  it('una disposición o una clave desconocidas fallan con su ruta', () => {
    expect(messages({ layout: 'grid' }, 'a/_index.md').join('\n')).toContain('index.layout');
    expect(messages({ sumary: 'x' }).join('\n')).toContain('index.sumary');
  });
});

describe('parseFrontmatter: slug', () => {
  it('acepta `slug`, la URL propia de la página', () => {
    const { frontmatter, errors } = parseFrontmatter(
      { slug: 'articles/n-plus-one-queries-django' },
      'a.en.md',
    );
    expect(errors).toEqual([]);
    expect(frontmatter.slug).toBe('articles/n-plus-one-queries-django');
  });

  it('un `slug` que no es texto nombra archivo y campo', () => {
    const { errors } = parseFrontmatter({ slug: 3 }, 'a.en.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.describe()).toContain('a.en.md');
    expect(errors[0]?.describe()).toContain('slug');
  });
});
