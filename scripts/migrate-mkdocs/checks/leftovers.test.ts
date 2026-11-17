import { describe, expect, it } from 'vitest';
import { checkOutput, findLeftovers, findSnippetStub } from './leftovers';

const md = (...lines: string[]) => lines.join('\n') + '\n';
const find = (source: string) => findLeftovers('a.md', source);

describe('findLeftovers', () => {
  it('un texto ya convertido no deja nada', () => {
    expect(find(md('# T', '', ':::warning[Ojo]', 'x', ':::', '', '> [!NOTE]', '> y'))).toEqual([]);
  });

  it.each([
    ['!!! note "T"', 'admonition'],
    ['??? tip', 'admonition'],
    ['???+ warning "T"', 'admonition'],
    ['=== "Python"', 'tab'],
    ['===+ "Python"', 'tab'],
    ['Pulsa :material-check: aquí', 'icon'],
    ['Va en :octicons-mark-github-16: GitHub', 'icon'],
    ['Con :fontawesome-brands-python: y más', 'icon'],
    ['Con :simple-docker:{ .lg } y más', 'icon'],
    ['--8<-- "CHANGELOG.md"', 'snippet'],
    ['Antes ;--8<-- "x.md"', 'snippet'],
  ])('detecta %s como %s', (line, kind) => {
    expect(find(md('# T', '', line))).toEqual([
      { file: 'a.md', line: 3, kind, preview: line.trim() },
    ]);
  });

  it('detecta bloques anidados o con sangría', () => {
    const found = find(
      md('1. Paso', '', '    !!! note "Dentro"', '        === "Tab"', '            x'),
    );
    expect(found.map((item) => [item.line, item.kind])).toEqual([
      [3, 'admonition'],
      [4, 'tab'],
    ]);
  });

  it('ignora lo que hay dentro de bloques de código', () => {
    const source = md(
      '```md',
      '!!! note "T"',
      '=== "A"',
      ':material-x:',
      '--8<-- "x"',
      '```',
      '',
      '~~~',
      '!!! tip',
      '~~~',
    );
    expect(find(source)).toEqual([]);
  });

  it('un fence de cuatro comillas no se cierra con uno de tres', () => {
    const source = md('````md', '```', '!!! note "T"', '```', '````', '!!! tip "Fuera"');
    expect(find(source).map((item) => item.line)).toEqual([6]);
  });

  it('retoma la detección tras cerrar el fence', () => {
    expect(find(md('```', 'x', '```', '!!! note')).map((item) => item.line)).toEqual([4]);
  });

  it('ignora el código en línea', () => {
    expect(find(md('Escribe `!!! note` y `:material-x:` o ``--8<-- "a"``.'))).toEqual([]);
    expect(find(md('`=== "A"`'))).toEqual([]);
  });

  it('un icono fuera del código se detecta aunque haya código en la línea', () => {
    expect(find(md('`x` y :material-check: fin')).map((item) => item.kind)).toEqual(['icon']);
  });

  it('una línea con varios tipos da una entrada por tipo', () => {
    expect(find(md(':material-a: --8<-- "x"')).map((item) => item.kind)).toEqual([
      'icon',
      'snippet',
    ]);
  });

  it('recorta la vista previa de las líneas largas', () => {
    const [item] = find(md(`!!! note "${'x'.repeat(200)}"`));
    expect(item.preview.length).toBeLessThanOrEqual(80);
    expect(item.preview.endsWith('…')).toBe(true);
  });

  it('no toma por admonición texto que solo se parece', () => {
    expect(find(md('¡Hola!!! Qué tal', 'a !!! b', '== "x"'))).toEqual([]);
  });
});

describe('findSnippetStub', () => {
  it('reconoce una página cuyo cuerpo es solo un include', () => {
    expect(findSnippetStub('changelog.md', md('--8<-- "CHANGELOG.md"'))).toEqual({
      file: 'changelog.md',
      include: 'CHANGELOG.md',
    });
  });

  it('admite frontmatter, un título y comillas simples', () => {
    const source = md(
      '---',
      'title: Cambios',
      '---',
      '',
      '# Cambios',
      '',
      "--8<-- 'CHANGELOG.md'",
      '',
    );
    expect(findSnippetStub('changelog.md', source)?.include).toBe('CHANGELOG.md');
  });

  it('admite comentarios HTML, también de varias líneas', () => {
    const source = md(
      '<!-- Sin contenido propio:',
      '     edítalo en la raíz. -->',
      '',
      '--8<-- "CHANGELOG.md"',
    );
    expect(findSnippetStub('changelog.md', source)?.include).toBe('CHANGELOG.md');
  });

  it('no es un stub si hay más contenido', () => {
    expect(findSnippetStub('a.md', md('# A', '', 'Texto.', '', '--8<-- "x.md"'))).toBeUndefined();
  });

  it('un include dentro de un fence no cuenta como stub', () => {
    expect(findSnippetStub('a.md', md('```', '--8<-- "x.md"', '```'))).toBeUndefined();
  });

  it('una página sin includes no es un stub', () => {
    expect(findSnippetStub('a.md', md('# A'))).toBeUndefined();
  });
});

describe('checkOutput', () => {
  it('separa los stubs de los restos y no cuenta el include del stub como resto', () => {
    const out = checkOutput(
      new Map([
        ['changelog.md', md('--8<-- "CHANGELOG.md"')],
        ['b.md', md('# B', '', '!!! note')],
        ['c.md', md('# C')],
      ]),
    );
    expect(out.stubs).toEqual([{ file: 'changelog.md', include: 'CHANGELOG.md' }]);
    expect(out.leftovers).toEqual([
      { file: 'b.md', line: 3, kind: 'admonition', preview: '!!! note' },
    ]);
  });

  it('ordena los restos por fichero y línea', () => {
    const out = checkOutput(
      new Map([
        ['z.md', md('!!! a')],
        ['a.md', md('# A', '!!! b')],
      ]),
    );
    expect(out.leftovers.map((item) => `${item.file}:${item.line}`)).toEqual(['a.md:2', 'z.md:1']);
  });
});
