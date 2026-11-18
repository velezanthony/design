import { describe, expect, it } from 'vitest';
import { resolveAutorefs } from './autorefs.ts';
import { removeAttrLists } from './attr-lists.ts';
import { stripHeadingId } from './heading-ids.ts';
import { removeIcons } from './icons.ts';
import { rewriteLinks } from './links.ts';

describe('removeIcons', () => {
  it('quita los códigos de icono y el espacio que los sigue', () => {
    expect(removeIcons(':material-check: Hecho', 2)).toEqual({
      output: 'Hecho',
      log: [{ kind: 'icon', line: 2, detail: ':material-check:' }],
    });
  });

  it.each([':octicons-mark-github-16:', ':fontawesome-brands-python:', ':simple-docker:'])(
    'reconoce %s',
    (icon) => {
      expect(removeIcons(`a ${icon} b`, 1).output).toBe('a b');
    },
  );

  it('se lleva también los atributos `{ .lg }` del icono', () => {
    expect(removeIcons(':material-x:{ .lg .middle } Texto', 1).output).toBe('Texto');
  });

  it('no toca el código en línea ni los dos puntos normales', () => {
    expect(removeIcons('`:material-x:` y 12:30:45', 1)).toEqual({
      output: '`:material-x:` y 12:30:45',
      log: [],
    });
  });
});

describe('removeAttrLists', () => {
  it('quita `{ .clase }` tras un enlace, imagen o énfasis', () => {
    expect(removeAttrLists('[a](b){ .md-button }', 1).output).toBe('[a](b)');
    expect(removeAttrLists('![i](x.png){ .lg }', 1).output).toBe('![i](x.png)');
    expect(removeAttrLists('**a**{ .x .y }', 1).log).toEqual([
      { kind: 'attr-list', line: 1, detail: '{ .x .y }' },
    ]);
  });

  it('deja intactas las llaves que no son una lista de atributos', () => {
    expect(removeAttrLists('a {x} y `[b](c){ .z }`', 1)).toEqual({
      output: 'a {x} y `[b](c){ .z }`',
      log: [],
    });
  });
});

describe('stripHeadingId', () => {
  it('quita el `{ #id }` de un encabezado', () => {
    expect(stripHeadingId('## Título { #mi-id }', 4)).toEqual({
      output: '## Título',
      log: [{ kind: 'heading-id', line: 4, detail: '## Título { #mi-id }' }],
    });
  });

  it('ignora lo que no es un encabezado con id', () => {
    expect(stripHeadingId('## Título', 1)).toEqual({ output: '## Título', log: [] });
    expect(stripHeadingId('texto { #id }', 1).log).toEqual([]);
  });
});

describe('resolveAutorefs', () => {
  const symbols = { 'pkg.Class': '/api/#pkg-class' };

  it('con símbolo conocido, `[X][sym]` pasa a enlace', () => {
    expect(resolveAutorefs('Ver [Class][pkg.Class]', 1, symbols)).toEqual({
      output: 'Ver [Class](/api/#pkg-class)',
      log: [{ kind: 'autoref', line: 1, detail: 'pkg.Class -> /api/#pkg-class' }],
    });
  });

  it('el símbolo puede ir implícito en el texto (`[`pkg.Class`][]`)', () => {
    expect(resolveAutorefs('[`pkg.Class`][]', 1, symbols).output).toBe(
      '[`pkg.Class`](/api/#pkg-class)',
    );
  });

  it('desconocido: deja el texto y lo registra', () => {
    expect(resolveAutorefs('[X][a.b]', 1, {})).toEqual({
      output: 'X',
      log: [{ kind: 'autoref-unresolved', line: 1, detail: 'a.b' }],
    });
  });

  it('sin punto en el símbolo no es una autorref', () => {
    expect(resolveAutorefs('a[0][1] y [x][y]', 1, symbols)).toEqual({
      output: 'a[0][1] y [x][y]',
      log: [],
    });
  });

  it('no toca el código en línea', () => {
    expect(resolveAutorefs('`[X][a.b]`', 1, {}).output).toBe('`[X][a.b]`');
  });
});

describe('rewriteLinks', () => {
  it('sustituye el destino y conserva el título del enlace', () => {
    const out = rewriteLinks('[a](x.md "T")', 3, (href) => `y/${href}`);
    expect(out).toEqual({
      output: '[a](y/x.md "T")',
      log: [{ kind: 'link', line: 3, detail: 'x.md -> y/x.md' }],
    });
  });

  it('`undefined` o el mismo destino deja el enlace como está', () => {
    expect(rewriteLinks('[a](x.md)', 1, () => undefined)).toEqual({ output: '[a](x.md)', log: [] });
    expect(rewriteLinks('[a](x.md)', 1, (href) => href).log).toEqual([]);
  });

  it('sin reescritor no hace nada', () => {
    expect(rewriteLinks('[a](x.md)', 1, undefined)).toEqual({ output: '[a](x.md)', log: [] });
  });

  it('no reescribe los enlaces dentro de código en línea', () => {
    expect(rewriteLinks('`[a](x.md)`', 1, () => 'z').output).toBe('`[a](x.md)`');
  });
});
