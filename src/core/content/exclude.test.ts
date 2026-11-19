import { describe, expect, it } from 'vitest';
import { excluder } from './exclude';

describe('excluder', () => {
  it('sin patrones no excluye nada', () => {
    expect(excluder([])('a.md')).toBe(false);
  });

  it('un nombre sin barra vale a cualquier profundidad', () => {
    const isExcluded = excluder(['borrador.md']);
    expect(isExcluded('borrador.md')).toBe(true);
    expect(isExcluded('guia/borrador.md')).toBe(true);
    expect(isExcluded('guia/otro.md')).toBe(false);
  });

  it('`*` no cruza carpetas y `**` sí', () => {
    expect(excluder(['guia/*.md'])('guia/a.md')).toBe(true);
    expect(excluder(['guia/*.md'])('guia/sub/a.md')).toBe(false);
    expect(excluder(['guia/**/*.md'])('guia/sub/a.md')).toBe(true);
    expect(excluder(['guia/**/*.md'])('guia/a.md')).toBe(true);
  });

  it('una carpeta con barra final excluye todo lo que hay dentro', () => {
    const isExcluded = excluder(['drafts/']);
    expect(isExcluded('drafts/a.md')).toBe(true);
    expect(isExcluded('guia/drafts/sub/a.md')).toBe(true);
    expect(isExcluded('drafts.md')).toBe(false);
  });

  it('una barra inicial ancla el patrón a la carpeta de contenido', () => {
    const isExcluded = excluder(['/borrador.md']);
    expect(isExcluded('borrador.md')).toBe(true);
    expect(isExcluded('guia/borrador.md')).toBe(false);
  });

  it('una barra intermedia también ancla', () => {
    const isExcluded = excluder(['guia/borrador.md']);
    expect(isExcluded('guia/borrador.md')).toBe(true);
    expect(isExcluded('otra/guia/borrador.md')).toBe(false);
  });

  it('`?` es un solo carácter y los caracteres especiales de regex se escapan', () => {
    expect(excluder(['a?.md'])('ab.md')).toBe(true);
    expect(excluder(['a?.md'])('abc.md')).toBe(false);
    expect(excluder(['a+b.md'])('a+b.md')).toBe(true);
    expect(excluder(['a+b.md'])('aab.md')).toBe(false);
  });

  it('`!` vuelve a incluir y manda el último patrón que coincide', () => {
    const isExcluded = excluder(['drafts/', '!drafts/listo.md']);
    expect(isExcluded('drafts/a.md')).toBe(true);
    expect(isExcluded('drafts/listo.md')).toBe(false);
  });

  it('el sufijo de idioma cuenta como parte del nombre', () => {
    expect(excluder(['*.es.md'])('guia.es.md')).toBe(true);
    expect(excluder(['*.es.md'])('guia.md')).toBe(false);
  });
});
