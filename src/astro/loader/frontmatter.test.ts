import { describe, expect, it } from 'vitest';
import { readFrontmatter } from './frontmatter';

describe('readFrontmatter', () => {
  it('parsea el YAML y devuelve el cuerpo sin él', () => {
    const { frontmatter, body, errors } = readFrontmatter(
      '---\ntitle: Hola\norder: 2\nseo:\n  noindex: true\n---\n# Hola',
      'guide.md',
    );
    expect(errors).toEqual([]);
    expect(frontmatter).toEqual({ title: 'Hola', order: 2, seo: { noindex: true } });
    expect(body.trimStart()).toBe('# Hola');
  });

  it('sin frontmatter: vacío y cuerpo intacto', () => {
    expect(readFrontmatter('# Hola', 'a.md')).toEqual({
      frontmatter: {},
      body: '# Hola',
      errors: [],
    });
  });

  it('YAML mal formado señala archivo y línea', () => {
    const { errors } = readFrontmatter('---\ntitle: [sin cerrar\n---\n# X', 'guide.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.file).toBe('guide.md');
    expect(errors[0]?.line).toBeGreaterThan(0);
  });

  it('un campo inválido llega como error con archivo y campo', () => {
    const { errors } = readFrontmatter('---\ntranslations: ocultar\n---\n# X', 'guide.md');
    expect(errors[0]?.file).toBe('guide.md');
    expect(errors[0]?.message).toContain('translations');
  });

  it('un bloque `---` sin cierre es un error con archivo y línea, no una regla horizontal', () => {
    const { errors } = readFrontmatter('---\ntitle: X\n\n# X\n', 'guide.md');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ file: 'guide.md', line: 1 });
    expect(errors[0]?.message).toContain('sin cerrar');
    expect(errors[0]?.hint).toContain('---');
  });

  it('un `---` de cierre presente no da error', () => {
    expect(readFrontmatter('---\ntitle: X\n---\n# X', 'guide.md').errors).toEqual([]);
  });
});
