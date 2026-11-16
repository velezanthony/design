import { describe, expect, it } from 'vitest';
import { transformMkdocs } from './transform';

const md = (...lines: string[]) => lines.join('\n') + '\n';
const run = (source: string, options = {}) => transformMkdocs(source, options);
const kinds = (source: string, options = {}) => run(source, options).log.map((entry) => entry.kind);

describe('admonitions', () => {
  it('convierte `!!! type "Título"` en una directiva con el cuerpo desindentado', () => {
    const out = run(
      md('!!! warning "Careful"', '', '    Body line.', '', '    Second.', '', 'After.'),
    );
    expect(out.markdown).toBe(
      md(':::warning[Careful]', 'Body line.', '', 'Second.', ':::', '', 'After.'),
    );
  });

  it.each([
    ['abstract', 'note'],
    ['summary', 'note'],
    ['success', 'tip'],
    ['failure', 'danger'],
    ['bug', 'danger'],
    ['example', 'info'],
    ['quote', 'note'],
  ])('mapea el alias %s a %s y lo registra', (alias, type) => {
    const out = run(md(`!!! ${alias} "T"`, '', '    x'));
    expect(out.markdown).toBe(md(`:::${type}[T]`, 'x', ':::'));
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'admonition-alias' }));
  });

  it('un alias sin título conserva el nombre original como título', () => {
    expect(run(md('!!! success', '', '    ok')).markdown).toBe(md(':::tip[Success]', 'ok', ':::'));
  });

  it('un tipo desconocido cae a note y se registra', () => {
    const out = run(md('!!! zzz "T"', '', '    x'));
    expect(out.markdown).toBe(md(':::note[T]', 'x', ':::'));
    expect(kinds(md('!!! zzz "T"', '', '    x'))).toContain('admonition-unknown');
  });

  it('un título con comillas escapadas se desescapa', () => {
    const out = run(md('!!! warning "An `<input type=\\"x\\">` fails"', '', '    x'));
    expect(out.markdown).toBe(md(':::warning[An `<input type="x">` fails]', 'x', ':::'));
  });

  it('sin título y con equivalente 1:1 sale como alerta de GitHub', () => {
    const out = run(md('!!! note', '', '    One.', '', '    Two.'));
    expect(out.markdown).toBe(md('> [!NOTE]', '> One.', '>', '> Two.'));
  });

  it.each([
    ['tip', 'TIP'],
    ['warning', 'WARNING'],
  ])('sin título, %s es la alerta %s', (type, alert) => {
    expect(run(md(`!!! ${type}`, '', '    x')).markdown).toBe(md(`> [!${alert}]`, '> x'));
  });

  it('sin título y sin equivalente 1:1 sale como directiva', () => {
    expect(run(md('!!! danger', '', '    x')).markdown).toBe(md(':::danger', 'x', ':::'));
    expect(run(md('!!! info ""', '', '    x')).markdown).toBe(md(':::info', 'x', ':::'));
  });

  it('`???` es una directiva plegada y `???+` abierta', () => {
    expect(run(md('??? tip "Hint"', '', '    x')).markdown).toBe(
      md(':::tip[Hint]{collapsed}', 'x', ':::'),
    );
    expect(run(md('???+ tip "Hint"', '', '    x')).markdown).toBe(md(':::tip[Hint]', 'x', ':::'));
  });

  it('conserva los bloques de código del cuerpo, desindentados', () => {
    const out = run(
      md('!!! note "N"', '', '    ```python', '    x = 1', '', '    y = 2', '    ```'),
    );
    expect(out.markdown).toBe(md(':::note[N]', '```python', 'x = 1', '', 'y = 2', '```', ':::'));
  });

  it('anida: la directiva exterior usa más dos puntos que la interior', () => {
    const out = run(md('!!! note "Outer"', '', '    !!! warning "Inner"', '', '        deep'));
    expect(out.markdown).toBe(md('::::note[Outer]', ':::warning[Inner]', 'deep', ':::', '::::'));
  });
});

describe('tabs', () => {
  it('agrupa `===` consecutivos en `::::tabs` con `:::tab[Etiqueta]`', () => {
    const out = run(
      md('=== "npm"', '', '    npm i x', '', '=== "pnpm"', '', '    pnpm add x', '', 'After.'),
    );
    expect(out.markdown).toBe(
      md(
        '::::tabs',
        ':::tab[npm]',
        'npm i x',
        ':::',
        ':::tab[pnpm]',
        'pnpm add x',
        ':::',
        '::::',
        '',
        'After.',
      ),
    );
  });

  it('dos grupos separados por texto son dos `::::tabs`', () => {
    const out = run(md('=== "A"', '', '    a', '', 'text', '', '=== "B"', '', '    b'));
    expect(out.markdown.match(/::::tabs/g)).toHaveLength(2);
  });

  it('un bloque de código dentro de una pestaña se desindenta', () => {
    const out = run(md('=== "A"', '', '    ```sh', '    ls', '    ```'));
    expect(out.markdown).toBe(md('::::tabs', ':::tab[A]', '```sh', 'ls', '```', ':::', '::::'));
  });

  it('una admonición dentro de una pestaña sube los dos puntos del contenedor', () => {
    const out = run(md('=== "A"', '', '    !!! note "N"', '', '        x'));
    expect(out.markdown).toBe(
      md(':::::tabs', '::::tab[A]', ':::note[N]', 'x', ':::', '::::', ':::::'),
    );
  });
});

describe('código intacto', () => {
  it('no toca nada dentro de un bloque con fence', () => {
    const src = md('```md', '!!! note "N"', '', '    x', '=== "A"', ':material-x: {#id}', '```');
    expect(run(src).markdown).toBe(src);
    expect(run(src).log).toEqual([]);
  });

  it('respeta fences de tildes y más largos', () => {
    const src = md('````md', '```', '!!! note "N"', '```', '````', '~~~', ':material-x:', '~~~');
    expect(run(src).markdown).toBe(src);
  });

  it('no toca el código en línea', () => {
    const src = md('Use `:material-x:` and `[A][b.c]` and `# t { #id }`.');
    expect(run(src).markdown).toBe(src);
  });
});

describe('icons and attributes', () => {
  it('quita los iconos con el espacio que los sigue y cuenta cuántos', () => {
    const out = run(
      md('- :material-key:{ .lg .middle } **Typed**', '[:octicons-arrow-right-24: Go](a.md)'),
    );
    expect(out.markdown).toBe(md('- **Typed**', '[Go](a.md)'));
    expect(out.log.filter((e) => e.kind === 'icon')).toHaveLength(2);
  });

  it('quita los atributos de clase `{ .md-button }` tras un enlace', () => {
    const out = run(md('[Go](a.md){ .md-button .md-button--primary }'));
    expect(out.markdown).toBe(md('[Go](a.md)'));
    expect(kinds(md('[Go](a.md){ .md-button }'))).toContain('attr-list');
  });

  it('deja intactas las llaves que no son attr_list', () => {
    const src = md('Use {name} and {"a": 1} here.');
    expect(run(src).markdown).toBe(src);
  });

  it('quita `{ #id }` de los encabezados y lo registra', () => {
    const out = run(md('## Title { #custom-id }', '### Other {#x}'));
    expect(out.markdown).toBe(md('## Title', '### Other'));
    expect(out.log.filter((e) => e.kind === 'heading-id')).toHaveLength(2);
  });
});

describe('tarjetas HTML con markdown', () => {
  it('quita el div `grid cards` y los separadores `---` de cada tarjeta', () => {
    const out = run(
      md(
        '<div class="grid cards" markdown>',
        '',
        '-   **One**',
        '',
        '    ---',
        '',
        '    Text.',
        '',
        '</div>',
        '',
        'After.',
      ),
    );
    expect(out.markdown).toBe(md('', '-   **One**', '', '', '    Text.', '', '', 'After.'));
    expect(kinds(md('<div class="grid cards" markdown>', '</div>'))).toContain('html-wrapper');
  });
});

describe('frontmatter', () => {
  it('quita las claves exclusivas de MkDocs y el frontmatter si queda vacío', () => {
    const out = run(md('---', 'hide:', '  - navigation', '---', '', '# T'));
    expect(out.markdown).toBe(md('# T'));
    expect(kinds(md('---', 'hide:', '  - toc', '---', '# T'))).toContain('frontmatter');
  });

  it('conserva el resto de claves', () => {
    const out = run(md('---', 'title: X', 'hide:', '  - toc', '---', '', '# T'));
    expect(out.markdown).toBe(md('---', 'title: X', '---', '', '# T'));
  });
});

describe('referencias de API', () => {
  it('sustituye `::: id` por el markdown generado', () => {
    const out = run(md('Intro.', '', '::: snakeorm.session.SnakeSession', '', 'After.'), {
      resolveApi: (id: string) => `### \`${id}\``,
    });
    expect(out.markdown).toBe(
      md('Intro.', '', '### `snakeorm.session.SnakeSession`', '', 'After.'),
    );
  });

  it('consume las opciones indentadas de la directiva', () => {
    const out = run(
      md('::: snakeorm.x', '    options:', '      show_source: false', '', 'After.'),
      {
        resolveApi: () => 'GEN',
      },
    );
    expect(out.markdown).toBe(md('GEN', '', 'After.'));
  });

  it('sin resolver, deja una nota y lo registra', () => {
    const out = run(md('::: snakeorm.x'));
    expect(out.markdown).toContain(':::note[API reference]');
    expect(out.markdown).toContain('`snakeorm.x`');
    expect(kinds(md('::: snakeorm.x'))).toContain('api-unresolved');
  });

  it('no confunde `:::note` con una directiva de mkdocstrings', () => {
    const src = md(':::note[T]', 'x', ':::');
    expect(run(src).markdown).toBe(src);
  });
});

describe('autorefs', () => {
  const symbols = { 'snakeorm.session.SnakeSession': 'api/session/#snakesession' };

  it('enlaza `[X][id]` a la página de API cuando se conoce', () => {
    const out = run(md('See [Session][snakeorm.session.SnakeSession].'), { symbols });
    expect(out.markdown).toBe(md('See [Session](api/session/#snakesession).'));
  });

  it('cae a texto plano si no se puede resolver, y lo registra', () => {
    const out = run(md('See [`Foo`][snakeorm.nope.Foo].'), { symbols });
    expect(out.markdown).toBe(md('See `Foo`.'));
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'autoref-unresolved' }));
  });

  it('no toca el indexado `rows[0][1]`', () => {
    const src = md('rows[0][1] and a[i][j]');
    expect(run(src).markdown).toBe(src);
  });
});

describe('enlaces', () => {
  it('reescribe los destinos que decide `rewriteHref` y registra el cambio', () => {
    const out = run(md('[Open](coverage/index.html) and [ok](a.md)'), {
      rewriteHref: (href: string) =>
        href.endsWith('.html') ? 'https://x/blob/' + href : undefined,
    });
    expect(out.markdown).toBe(md('[Open](https://x/blob/coverage/index.html) and [ok](a.md)'));
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'link' }));
  });

  it('no reescribe enlaces dentro de código', () => {
    const src = md('`[a](b.html)`');
    expect(run(src, { rewriteHref: () => 'z' }).markdown).toBe(src);
  });
});
