import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../testing/contrast';
import { themePalette } from './sitemap';

/* `theme.css` es solo la entrada: importa los ficheros por tema, y el test mira el conjunto. */
const entry = readFileSync('src/components/styles/theme.css', 'utf8');
const parts = [...entry.matchAll(/@import '\.\/([^']+)'/g)].map((match) =>
  readFileSync(`src/components/styles/${match[1]}`, 'utf8'),
);
const css = [entry, ...parts].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Cuerpo del primer bloque `{ ... }` (sin llaves anidadas) tras `opener`. */
function block(source: string, opener: RegExp): string {
  const match = opener.exec(source);
  if (!match) throw new Error(`bloque no encontrado: ${opener}`);
  const start = match.index + match[0].length;
  let depth = 1;
  for (let index = start; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index);
  }
  throw new Error(`bloque sin cerrar: ${opener}`);
}

const theme = block(css, /@theme\s*\{/);
const colorNames = [...theme.matchAll(/--color-([\w-]+):/g)].map((match) => match[1]!);
const { light, dark } = themePalette(theme, colorNames);

describe('tokens', () => {
  it.each([
    'canvas',
    'raised',
    'ink',
    'muted',
    'faint',
    'accent',
    'accent-soft',
    'rule',
    'state-live',
    'state-wip',
  ])('define el color %s', (name) => {
    expect(light).toHaveProperty(name);
  });

  it.each(['--font-sans', '--font-mono', '--text-display', '--text-row', '--text-label'])(
    'define %s',
    (token) => {
      expect(css).toContain(`${token}:`);
    },
  );

  it.each(['measure', 'text', 'page'])('define el ancho --container-%s', (name) => {
    expect(css).toContain(`--container-${name}:`);
  });

  it('importa tailwind y escanea todo src/, donde viven los componentes que usan utilidades', () => {
    expect(css).toContain("@import 'tailwindcss';");
    const source = /@source '([^']+)';/.exec(css)?.[1];
    expect(source).toBeDefined();
    // Relativa a este fichero: tiene que llegar a src/, no quedarse en src/components/styles/.
    const scanned = resolve(dirname(fileURLToPath(import.meta.url)), source!);
    expect(existsSync(resolve(scanned, 'components/molecules'))).toBe(true);
    expect(existsSync(resolve(scanned, 'astro/routes'))).toBe(true);
  });
});

describe('lo exclusivo del portfolio', () => {
  it('no declara tokens --cv-* ni --sheet-*', () => {
    expect(css).not.toMatch(/--(cv|sheet)-/);
  });

  it('no trae reglas de impresión ni de hoja', () => {
    expect(css).not.toMatch(/@media print/);
    expect(css).not.toMatch(/@page/);
    expect(css).not.toMatch(/\.sheet\b|\.print-hidden|@utility cv-head/);
  });

  it('no trae los colores de la nota de pendientes del portfolio', () => {
    expect(css).not.toMatch(/--color-todo/);
  });
});

describe('modos oscuros', () => {
  it.each(colorNames)('el color %s se declara una sola vez', (name) => {
    expect(theme.match(new RegExp(`--color-${name}:`, 'g'))).toHaveLength(1);
  });

  it('fuera de `@theme` no hay otra paleta: el pie solo reasigna tokens', () => {
    expect(css.replace(theme, '')).not.toMatch(/--color-[\w-]+:\s*(#|light-dark)/);
  });

  it('cada color tiene su par claro y oscuro (solo el pie lleva el mismo en los dos)', () => {
    const same = colorNames.filter((name) => light[name] === dark[name]).sort();
    expect(same).toEqual(['inverse-ink', 'inverse-muted']);
  });

  it('el sistema decide con `color-scheme` y el selector no repite la paleta', () => {
    expect(css).toMatch(/:root\s*\{[^{}]*color-scheme:\s*light dark\s*;/);
    expect(css).not.toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root/);
  });

  /* El oscuro para lo que no son colores sueltos: el claro elegido gana al sistema oscuro. */
  it('la variante `dark` cubre el sistema oscuro sin claro elegido y el oscuro elegido', () => {
    const variant = block(css, /@custom-variant dark\s*\{/);
    expect(variant).toContain('prefers-color-scheme: dark');
    expect(variant).toContain(":root:not([data-theme='light'])");
    expect(variant).toContain(":root[data-theme='dark']");
  });

  /* Los controles nativos y las barras de scroll toman el esquema del sistema salvo que la página
     lo nombre: una elección hecha con el selector debe llegar también a ellos. */
  it.each(['light', 'dark'])('un tema elegido (%s) fija color-scheme', (theme) => {
    const rule = new RegExp(
      `:root\\[data-theme='${theme}'\\]\\s*\\{[^{}]*color-scheme:\\s*${theme}\\s*;`,
    );
    expect(css).toMatch(rule);
  });
});

/* Pares texto/fondo: 4.5:1 en cuerpo, 3:1 en texto grande o interfaz (WCAG AA). */
const pairs: [string, string, number][] = [
  ['ink', 'canvas', 4.5],
  ['ink', 'raised', 4.5],
  ['muted', 'canvas', 4.5],
  ['muted', 'raised', 4.5],
  ['faint', 'canvas', 4.5],
  ['faint', 'raised', 4.5],
  ['accent', 'canvas', 4.5],
  ['accent', 'raised', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['canvas', 'accent', 4.5],
  ['state-live', 'canvas', 4.5],
  ['state-live', 'raised', 4.5],
  ['state-wip', 'canvas', 4.5],
  ['state-wip', 'raised', 4.5],
  ['danger', 'canvas', 4.5],
  ['danger', 'raised', 4.5],
  ['rule', 'canvas', 1.2],
];

describe.each([
  ['claro', light],
  ['oscuro', dark],
])('contraste (%s)', (_label, colors) => {
  it.each(pairs)('%s sobre %s ≥ %d:1', (foreground, background, min) => {
    expect(colors[foreground], `falta --color-${foreground}`).toBeDefined();
    expect(colors[background], `falta --color-${background}`).toBeDefined();
    expect(contrast(colors[foreground]!, colors[background]!)).toBeGreaterThanOrEqual(min);
  });
});

describe('estilos de documentación', () => {
  const kinds = ['note', 'info', 'tip', 'warning', 'danger', 'question'];

  it('estilan `.admonition` y su título', () => {
    expect(css).toMatch(/\.admonition\b/);
    expect(css).toMatch(/\.admonition-title\b/);
  });

  it.each(kinds)('la admonición %s tiene su regla por data-kind', (kind) => {
    expect(css).toContain(`.admonition[data-kind='${kind}']`);
  });

  it('la admonición desplegable (details/summary) tiene estilo propio', () => {
    expect(css).toMatch(/details\.admonition\b/);
    expect(css).toMatch(/\.admonition\s*>\s*summary|summary\.admonition-title/);
  });

  it.each(['.docs-tabs', '.docs-tablist', '.docs-tab', '.docs-tab-panel', '.docs-tab-label'])(
    'estila %s',
    (selector) => {
      expect(css).toContain(selector);
    },
  );

  it('sin JavaScript los paneles quedan apilados con su etiqueta visible', () => {
    expect(css).toMatch(/\.docs-tabs\[data-enhanced\]\s+\.docs-tab-label/);
    expect(css).toMatch(/\.docs-tabs:not\(\[data-enhanced\]\)\s+\.docs-tablist/);
  });
});

describe('prose', () => {
  const prose = block(css, /@utility prose\s*\{/);

  it('cubre encabezados, listas, tablas, code, pre, imágenes, blockquote, admoniciones y pestañas', () => {
    for (const piece of [
      'h2',
      'ul',
      'table',
      'code',
      'pre',
      'img',
      'blockquote',
      '.table-scroll',
    ]) {
      expect(prose, piece).toContain(piece);
    }
  });

  it('no escribe a mano colores literales (solo tokens)', () => {
    expect(prose).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(prose).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab)\(/);
    expect(prose).not.toMatch(/:\s*(white|black|red|green|blue|gray|grey)\b/);
  });

  it('las reglas de admoniciones y pestañas tampoco usan colores literales', () => {
    const docs = css.slice(css.indexOf('.admonition'));
    const outsideShiki = docs.replace(/var\(--shiki[^)]*\)/g, '');
    expect(outsideShiki).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('estructura del tema', () => {
  it('declara una sola vez la navegación entre páginas con transición', () => {
    expect(css.match(/@view-transition\s*\{/g)).toHaveLength(1);
  });

  it('la curva de las transiciones solo se escribe en su token', () => {
    expect(css.match(/cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/g)).toHaveLength(1);
    expect(css).toContain('--ease-glide:');
  });

  /* Tabs es un componente público y `DocsLayout` admite `prose={false}`: sin `.prose` debe verse igual. */
  it.each(['.docs-tablist', '.docs-tab-label {', '.docs-copy', '.docs-mermaid-figure'])(
    'el estilo de %s no cuelga de `prose`',
    (selector) => {
      expect(block(css, /@utility prose\s*\{/)).not.toContain(selector);
      expect(css).toContain(selector);
    },
  );
});

describe('superficie invertida', () => {
  it('`.surface-inverse` redefine los tokens en su ámbito y ya no se llama `.docs-footer`', () => {
    expect(css).toMatch(/\.surface-inverse\s*\{[^{}]*--color-ink:\s*var\(--color-inverse-ink\)/);
    expect(css).not.toContain('.docs-footer');
  });
});
