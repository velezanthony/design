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
