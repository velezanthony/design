import { describe, expect, it } from 'vitest';
import { DocsError } from '../errors';
import { resolveTitle } from './title';

describe('resolveTitle', () => {
  it('toma el texto del primer H1', () => {
    expect(resolveTitle('# Install guide\n\nTexto')).toBe('Install guide');
  });

  it('quita el marcado inline (código, énfasis, enlaces)', () => {
    expect(resolveTitle('# `foo` tool')).toBe('foo tool');
    expect(resolveTitle('# **Fuerte** y *suave*')).toBe('Fuerte y suave');
    expect(resolveTitle('# Ver [la guía](./g.md)')).toBe('Ver la guía');
  });

  it('ignora almohadillas de cierre y espacios', () => {
    expect(resolveTitle('#   Hola   ##')).toBe('Hola');
  });

  it('el primer H1 manda, aunque haya más', () => {
    expect(resolveTitle('# Uno\n\n# Dos')).toBe('Uno');
  });

  it('un `#` dentro de un bloque de código no es H1', () => {
    expect(resolveTitle('```sh\n# comentario\n```\n\n# Real')).toBe('Real');
    expect(resolveTitle('~~~\n# nope\n~~~\n# Real')).toBe('Real');
  });

  it('un H2 no es H1', () => {
    expect(() => resolveTitle('## Solo H2')).toThrow(DocsError);
  });

  it('el title del frontmatter sustituye al H1', () => {
    expect(resolveTitle('# Del H1', 'Del frontmatter')).toBe('Del frontmatter');
    expect(resolveTitle('Sin H1', 'Solo frontmatter')).toBe('Solo frontmatter');
  });

  it('un title vacío del frontmatter cae al H1', () => {
    expect(resolveTitle('# H1', '  ')).toBe('H1');
  });

  it('sin H1 ni frontmatter falla con una pista', () => {
    const error = (() => {
      try {
        resolveTitle('texto', undefined, 'sin-titulo.md');
      } catch (e) {
        return e as DocsError;
      }
    })();
    expect(error).toBeInstanceOf(DocsError);
    expect(error?.file).toBe('sin-titulo.md');
    expect(error?.hint).toBeTruthy();
  });
});
