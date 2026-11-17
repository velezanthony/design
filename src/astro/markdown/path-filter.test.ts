import { describe, expect, it } from 'vitest';
import { docFileURL, externalFileURL, nonDocFileURL, project } from '../../testing/markdown';
import { createScope, shouldTransform } from './path-filter';

const scope = createScope(project, ['CHANGELOG.md', 'CHANGELOG.es.md', '../README.md']);

describe('shouldTransform', () => {
  it('transforma los docs nativos, también los anidados y los de otro idioma', () => {
    expect(shouldTransform(docFileURL('guide.md'), scope)).toBe(true);
    expect(shouldTransform(docFileURL('guide/install.es.md'), scope)).toBe(true);
  });

  it('transforma los externos resueltos, en cualquier idioma, y los de fuera del proyecto', () => {
    expect(shouldTransform(externalFileURL('CHANGELOG.md'), scope)).toBe(true);
    expect(shouldTransform(externalFileURL('CHANGELOG.es.md'), scope)).toBe(true);
    expect(shouldTransform(new URL('file:///README.md'), scope)).toBe(true);
  });

  it('no toca el resto de Markdown del proyecto', () => {
    expect(shouldTransform(nonDocFileURL('about.md'), scope)).toBe(false);
    expect(shouldTransform(externalFileURL('NOTES.md'), scope)).toBe(false);
  });

  it('el prefijo lleva barra final: `docs-old/` o `docs.md` no cuentan como `docs/`', () => {
    expect(shouldTransform(new URL('src/content/docs-old/a.md', project), scope)).toBe(false);
    expect(shouldTransform(new URL('src/content/docs.md', project), scope)).toBe(false);
  });

  it('un compile sin fileURL no se transforma', () => {
    expect(shouldTransform(undefined, scope)).toBe(false);
  });

  it('acepta un ./ en la ruta declarada y una raíz sin barra final', () => {
    const loose = createScope(new URL('file:///site'), ['./CHANGELOG.md']);
    expect(shouldTransform(externalFileURL('CHANGELOG.md'), loose)).toBe(true);
    expect(shouldTransform(docFileURL('a.md'), loose)).toBe(true);
  });
});

describe('shouldTransform con la carpeta de contenido fuera del proyecto', () => {
  const outside = createScope(project, ['../CHANGELOG.md'], '../docs');

  it('transforma las páginas de `../docs/`, anidadas y de otro idioma', () => {
    expect(shouldTransform(new URL('file:///docs/index.md'), outside)).toBe(true);
    expect(shouldTransform(new URL('file:///docs/users/guia.es.md'), outside)).toBe(true);
  });

  it('ya no trata `src/content/docs/` como documentación', () => {
    expect(shouldTransform(docFileURL('guide.md'), outside)).toBe(false);
  });

  it('el prefijo lleva barra final: `docs-old/` no cuenta como `docs/`', () => {
    expect(shouldTransform(new URL('file:///docs-old/a.md'), outside)).toBe(false);
  });

  it('los external siguen valiendo', () => {
    expect(shouldTransform(new URL('file:///CHANGELOG.md'), outside)).toBe(true);
  });

  it('una carpeta dentro del proyecto (`documentacion`) también se transforma', () => {
    const inside = createScope(project, [], 'documentacion');
    expect(shouldTransform(new URL('documentacion/a.md', project), inside)).toBe(true);
  });
});
