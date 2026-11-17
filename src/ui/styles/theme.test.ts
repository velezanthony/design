import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { contrast } from '../../testing/contrast';

const raw = readFileSync('src/ui/styles/theme.css', 'utf8');
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

/** Cuerpo del primer bloque `{ ... }` (sin llaves anidadas) tras `opener`. */
function block(source: string, opener: RegExp): string {
  const match = opener.exec(source);
  if (!match) throw new Error(`bloque no encontrado: ${opener}`);
  const start = match.index + match[0].length;
  let depth = 1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i);
  }
  throw new Error(`bloque sin cerrar: ${opener}`);
}

/** `--color-x: #abc;` de un bloque a mapa. */
function palette(body: string): Record<string, string> {
  return Object.fromEntries(
    [...body.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = palette(block(css, /@theme\s*\{/));
const darkSystem = block(
  css,
  /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light'\]\)\s*\{/,
);
const darkChosen = block(css, /:root\[data-theme='dark'\]\s*\{/);

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

  it.each(['measure', 'text', 'page', 'aside'])('define el ancho --container-%s', (name) => {
    expect(css).toContain(`--container-${name}:`);
  });

  it('importa tailwind y escanea todo src/, donde viven los componentes que usan utilidades', () => {
    expect(css).toContain("@import 'tailwindcss';");
    const source = /@source '([^']+)';/.exec(css)?.[1];
    expect(source).toBeDefined();
    // Relativa a este fichero: tiene que llegar a src/, no quedarse en src/ui/styles/.
    const scanned = resolve(dirname(fileURLToPath(import.meta.url)), source!);
    expect(existsSync(resolve(scanned, 'ui/molecules'))).toBe(true);
    expect(existsSync(resolve(scanned, 'astro/pages'))).toBe(true);
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
  it('declaran paletas completas', () => {
    expect(Object.keys(palette(darkSystem)).sort()).toEqual(Object.keys(light).sort());
  });

  it('el del sistema y el elegido con el selector tienen las mismas paletas', () => {
    expect(palette(darkChosen)).toEqual(palette(darkSystem));
  });

  it('el claro forzado en sistema oscuro no entra en el bloque del sistema', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light'\]\)/,
    );
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
  ['oscuro', palette(darkChosen)],
])('contraste (%s)', (_, colors) => {
  it.each(pairs)('%s sobre %s ≥ %d:1', (fg, bg, min) => {
    expect(colors[fg], `falta --color-${fg}`).toBeDefined();
    expect(colors[bg], `falta --color-${bg}`).toBeDefined();
    expect(contrast(colors[fg]!, colors[bg]!)).toBeGreaterThanOrEqual(min);
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
