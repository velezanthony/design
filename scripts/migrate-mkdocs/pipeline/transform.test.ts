import { describe, expect, it } from 'vitest';
import { transformMkdocs } from './transform';

function reportMarkdown(...lines: string[]) {
  return lines.join('\n') + '\n';
}
function run(source: string, options = {}) {
  return transformMkdocs(source, options);
}
function kinds(source: string, options = {}) {
  return run(source, options).log.map((entry) => entry.kind);
}

describe('admonitions', () => {
  it('convierte `!!! type "Título"` en una directiva con el cuerpo desindentado', () => {
    const out = run(
      reportMarkdown(
        '!!! warning "Careful"',
        '',
        '    Body line.',
        '',
        '    Second.',
        '',
        'After.',
      ),
    );
    expect(out.markdown).toBe(
      reportMarkdown(':::warning[Careful]', 'Body line.', '', 'Second.', ':::', '', 'After.'),
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
    const out = run(reportMarkdown(`!!! ${alias} "T"`, '', '    x'));
    expect(out.markdown).toBe(reportMarkdown(`:::${type}[T]`, 'x', ':::'));
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'admonition-alias' }));
  });

  it('un alias sin título conserva el nombre original como título', () => {
    expect(run(reportMarkdown('!!! success', '', '    ok')).markdown).toBe(
      reportMarkdown(':::tip[Success]', 'ok', ':::'),
    );
  });

  it('un tipo desconocido cae a note y se registra', () => {
    const out = run(reportMarkdown('!!! zzz "T"', '', '    x'));
    expect(out.markdown).toBe(reportMarkdown(':::note[T]', 'x', ':::'));
    expect(kinds(reportMarkdown('!!! zzz "T"', '', '    x'))).toContain('admonition-unknown');
  });

  it('un título con comillas escapadas se desescapa', () => {
    const out = run(reportMarkdown('!!! warning "An `<input type=\\"x\\">` fails"', '', '    x'));
    expect(out.markdown).toBe(
      reportMarkdown(':::warning[An `<input type="x">` fails]', 'x', ':::'),
    );
  });

  it('sin título y con equivalente 1:1 sale como alerta de GitHub', () => {
    const out = run(reportMarkdown('!!! note', '', '    One.', '', '    Two.'));
    expect(out.markdown).toBe(reportMarkdown('> [!NOTE]', '> One.', '>', '> Two.'));
  });

  it.each([
    ['tip', 'TIP'],
    ['warning', 'WARNING'],
  ])('sin título, %s es la alerta %s', (type, alert) => {
    expect(run(reportMarkdown(`!!! ${type}`, '', '    x')).markdown).toBe(
      reportMarkdown(`> [!${alert}]`, '> x'),
    );
  });

  it('sin título y sin equivalente 1:1 sale como directiva', () => {
    expect(run(reportMarkdown('!!! danger', '', '    x')).markdown).toBe(
      reportMarkdown(':::danger', 'x', ':::'),
    );
    expect(run(reportMarkdown('!!! info ""', '', '    x')).markdown).toBe(
      reportMarkdown(':::info', 'x', ':::'),
    );
  });

  it('`???` es una directiva plegada y `???+` abierta', () => {
    expect(run(reportMarkdown('??? tip "Hint"', '', '    x')).markdown).toBe(
      reportMarkdown(':::tip[Hint]{collapsed}', 'x', ':::'),
    );
    expect(run(reportMarkdown('???+ tip "Hint"', '', '    x')).markdown).toBe(
      reportMarkdown(':::tip[Hint]', 'x', ':::'),
    );
  });

  it('conserva los bloques de código del cuerpo, desindentados', () => {
    const out = run(
      reportMarkdown('!!! note "N"', '', '    ```python', '    x = 1', '', '    y = 2', '    ```'),
    );
    expect(out.markdown).toBe(
      reportMarkdown(':::note[N]', '```python', 'x = 1', '', 'y = 2', '```', ':::'),
    );
  });

  it('anida: la directiva exterior usa más dos puntos que la interior', () => {
    const out = run(
      reportMarkdown('!!! note "Outer"', '', '    !!! warning "Inner"', '', '        deep'),
    );
    expect(out.markdown).toBe(
      reportMarkdown('::::note[Outer]', ':::warning[Inner]', 'deep', ':::', '::::'),
    );
  });
});

describe('tabs', () => {
  it('agrupa `===` consecutivos en `::::tabs` con `:::tab[Etiqueta]`', () => {
    const out = run(
      reportMarkdown(
        '=== "npm"',
        '',
        '    npm i x',
        '',
        '=== "pnpm"',
        '',
        '    pnpm add x',
        '',
        'After.',
      ),
    );
    expect(out.markdown).toBe(
      reportMarkdown(
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
    const out = run(reportMarkdown('=== "A"', '', '    a', '', 'text', '', '=== "B"', '', '    b'));
    expect(out.markdown.match(/::::tabs/g)).toHaveLength(2);
  });

  it('un bloque de código dentro de una pestaña se desindenta', () => {
    const out = run(reportMarkdown('=== "A"', '', '    ```sh', '    ls', '    ```'));
    expect(out.markdown).toBe(
      reportMarkdown('::::tabs', ':::tab[A]', '```sh', 'ls', '```', ':::', '::::'),
    );
  });

  it('una admonición dentro de una pestaña sube los dos puntos del contenedor', () => {
    const out = run(reportMarkdown('=== "A"', '', '    !!! note "N"', '', '        x'));
    expect(out.markdown).toBe(
      reportMarkdown(':::::tabs', '::::tab[A]', ':::note[N]', 'x', ':::', '::::', ':::::'),
    );
  });
});

describe('código intacto', () => {
  it('no toca nada dentro de un bloque con fence', () => {
    const src = reportMarkdown(
      '```md',
      '!!! note "N"',
      '',
      '    x',
      '=== "A"',
      ':material-x: {#id}',
      '```',
    );
    expect(run(src).markdown).toBe(src);
    expect(run(src).log).toEqual([]);
  });

  it('respeta fences de tildes y más largos', () => {
    const src = reportMarkdown(
      '````md',
      '```',
      '!!! note "N"',
      '```',
      '````',
      '~~~',
      ':material-x:',
      '~~~',
    );
    expect(run(src).markdown).toBe(src);
  });

  it('no toca el código en línea', () => {
    const src = reportMarkdown('Use `:material-x:` and `[A][b.c]` and `# t { #id }`.');
    expect(run(src).markdown).toBe(src);
  });
});

describe('icons and attributes', () => {
  it('quita los iconos con el espacio que los sigue y cuenta cuántos', () => {
    const out = run(
      reportMarkdown(
        '- :material-key:{ .lg .middle } **Typed**',
        '[:octicons-arrow-right-24: Go](a.md)',
      ),
    );
    expect(out.markdown).toBe(reportMarkdown('- **Typed**', '[Go](a.md)'));
    expect(out.log.filter((entry) => entry.kind === 'icon')).toHaveLength(2);
  });

  it('quita los atributos de clase `{ .md-button }` tras un enlace', () => {
    const out = run(reportMarkdown('[Go](a.md){ .md-button .md-button--primary }'));
    expect(out.markdown).toBe(reportMarkdown('[Go](a.md)'));
    expect(kinds(reportMarkdown('[Go](a.md){ .md-button }'))).toContain('attr-list');
  });

  it('deja intactas las llaves que no son attr_list', () => {
    const src = reportMarkdown('Use {name} and {"a": 1} here.');
    expect(run(src).markdown).toBe(src);
  });

  it('quita `{ #id }` de los encabezados y lo registra', () => {
    const out = run(reportMarkdown('## Title { #custom-id }', '### Other {#x}'));
    expect(out.markdown).toBe(reportMarkdown('## Title', '### Other'));
    expect(out.log.filter((entry) => entry.kind === 'heading-id')).toHaveLength(2);
  });
});

describe('tarjetas HTML con markdown', () => {
  it('quita el div `grid cards` y los separadores `---` de cada tarjeta', () => {
    const out = run(
      reportMarkdown(
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
    expect(out.markdown).toBe(
      reportMarkdown('', '-   **One**', '', '', '    Text.', '', '', 'After.'),
    );
    expect(kinds(reportMarkdown('<div class="grid cards" markdown>', '</div>'))).toContain(
      'html-wrapper',
    );
  });
});

describe('frontmatter', () => {
  it('quita las claves exclusivas de MkDocs y el frontmatter si queda vacío', () => {
    const out = run(reportMarkdown('---', 'hide:', '  - navigation', '---', '', '# T'));
    expect(out.markdown).toBe(reportMarkdown('# T'));
    expect(kinds(reportMarkdown('---', 'hide:', '  - toc', '---', '# T'))).toContain('frontmatter');
  });

  it('conserva el resto de claves', () => {
    const out = run(reportMarkdown('---', 'title: X', 'hide:', '  - toc', '---', '', '# T'));
    expect(out.markdown).toBe(reportMarkdown('---', 'title: X', '---', '', '# T'));
  });
});

describe('referencias de API', () => {
  it('sustituye `::: id` por el markdown generado', () => {
    const out = run(
      reportMarkdown('Intro.', '', '::: snakeorm.session.SnakeSession', '', 'After.'),
      {
        resolveApi: (id: string) => `### \`${id}\``,
      },
    );
    expect(out.markdown).toBe(
      reportMarkdown('Intro.', '', '### `snakeorm.session.SnakeSession`', '', 'After.'),
    );
  });

  it('consume las opciones indentadas de la directiva', () => {
    const out = run(
      reportMarkdown('::: snakeorm.x', '    options:', '      show_source: false', '', 'After.'),
      {
        resolveApi: () => 'GEN',
      },
    );
    expect(out.markdown).toBe(reportMarkdown('GEN', '', 'After.'));
  });

  it('sin resolver, deja una nota y lo registra', () => {
    const out = run(reportMarkdown('::: snakeorm.x'));
    expect(out.markdown).toContain(':::note[API reference]');
    expect(out.markdown).toContain('`snakeorm.x`');
    expect(kinds(reportMarkdown('::: snakeorm.x'))).toContain('api-unresolved');
  });

  it('no confunde `:::note` con una directiva de mkdocstrings', () => {
    const src = reportMarkdown(':::note[T]', 'x', ':::');
    expect(run(src).markdown).toBe(src);
  });
});

describe('autorefs', () => {
  const symbols = { 'snakeorm.session.SnakeSession': 'api/session/#snakesession' };

  it('enlaza `[X][id]` a la página de API cuando se conoce', () => {
    const out = run(reportMarkdown('See [Session][snakeorm.session.SnakeSession].'), { symbols });
    expect(out.markdown).toBe(reportMarkdown('See [Session](api/session/#snakesession).'));
  });

  it('cae a texto plano si no se puede resolver, y lo registra', () => {
    const out = run(reportMarkdown('See [`Foo`][snakeorm.nope.Foo].'), { symbols });
    expect(out.markdown).toBe(reportMarkdown('See `Foo`.'));
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'autoref-unresolved' }));
  });

  it('no toca el indexado `rows[0][1]`', () => {
    const src = reportMarkdown('rows[0][1] and a[i][j]');
    expect(run(src).markdown).toBe(src);
  });
});

describe('enlaces', () => {
  it('reescribe los destinos que decide `rewriteHref` y registra el cambio', () => {
    const out = run(reportMarkdown('[Open](coverage/index.html) and [ok](a.md)'), {
      rewriteHref: (href: string) =>
        href.endsWith('.html') ? 'https://x/blob/' + href : undefined,
    });
    expect(out.markdown).toBe(
      reportMarkdown('[Open](https://x/blob/coverage/index.html) and [ok](a.md)'),
    );
    expect(out.log).toContainEqual(expect.objectContaining({ kind: 'link' }));
  });

  it('no reescribe enlaces dentro de código', () => {
    const src = reportMarkdown('`[a](b.html)`');
    expect(run(src, { rewriteHref: () => 'z' }).markdown).toBe(src);
  });
});

describe('lenguaje de los bloques de código', () => {
  function upgrades(source: string) {
    return run(source).log.filter((entry) => entry.kind === 'code-language');
  }

  it('una sesión de shell sin lenguaje pasa a console', () => {
    const out = run(reportMarkdown('```', '$ npm install', '$ npm test', '```'));
    expect(out.markdown).toBe(reportMarkdown('```console', '$ npm install', '$ npm test', '```'));
    expect(out.log).toEqual([{ kind: 'code-language', line: 1, detail: 'none -> console' }]);
  });

  it('un comando con su salida debajo también es console, y `text` se mejora igual', () => {
    const out = run(reportMarkdown('```text', '$ python -V', 'Python 3.12.1', '```'));
    expect(out.markdown).toBe(reportMarkdown('```console', '$ python -V', 'Python 3.12.1', '```'));
    expect(upgrades(out.markdown)).toEqual([]);
    expect(out.log[0]).toMatchObject({ detail: 'text -> console' });
  });

  it('empieza por una sentencia SQL: sql', () => {
    for (const keyword of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'WITH']) {
      const out = run(reportMarkdown('```', `${keyword} x`, 'FROM t;', '```'));
      expect(out.markdown.split('\n')[0]).toBe('```sql');
    }
  });

  it('respeta la sangría y los fences de tildes', () => {
    const out = run(reportMarkdown('  ~~~', '  SELECT 1;', '  ~~~'));
    expect(out.markdown).toBe(reportMarkdown('  ~~~sql', '  SELECT 1;', '  ~~~'));
  });

  it('dentro de una admonición también se mejora', () => {
    const out = run(reportMarkdown('!!! tip "T"', '', '    ```', '    $ ls', '    ```'));
    expect(out.markdown).toContain('```console');
  });

  it('no inventa: texto sin pista clara se queda como está', () => {
    for (const body of [['x = 1', 'print(x)'], ['hola', '$ ls'], ['select * from t'], ['']]) {
      const src = reportMarkdown('```', ...body, '```');
      expect(run(src).markdown).toBe(src);
      expect(upgrades(src)).toEqual([]);
    }
  });

  it('nunca toca un fence que ya tiene un lenguaje distinto de text', () => {
    const src = reportMarkdown('```python', '$ ls', '```', '', '```bash', 'SELECT 1', '```');
    expect(run(src).markdown).toBe(src);
  });

  it('no cambia un fence con atributos tras el nombre', () => {
    const src = reportMarkdown('``` title="x"', '$ ls', '```');
    expect(run(src).markdown).toBe(src);
  });

  it('un fence sin cerrar no se toca', () => {
    const src = reportMarkdown('```', '$ ls');
    expect(run(src).markdown).toBe(src);
  });
});
