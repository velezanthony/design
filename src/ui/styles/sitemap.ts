/** Los colores del tema que usa la hoja del sitemap (`--color-<token>` en `theme.css`). */
export const SITEMAP_TOKENS = ['canvas', 'ink', 'muted', 'faint', 'accent', 'rule'] as const;

export interface Palette {
  light: Record<string, string>;
  dark: Record<string, string>;
}

/** Paleta leída de `theme.css` (el sitemap es XML y no carga el tema); por token, primer valor claro y segundo oscuro; falla si falta alguno. */
export function themePalette(theme: string, tokens: readonly string[]): Palette {
  const palette: Palette = { light: {}, dark: {} };
  for (const token of tokens) {
    const [light, dark] = [...theme.matchAll(new RegExp(`--color-${token}:\\s*([^;]+);`, 'g'))].map(
      (match) => match[1]!.trim(),
    );
    if (light === undefined || dark === undefined) {
      throw new Error(`theme.css no define --color-${token} en modo claro y oscuro.`);
    }
    palette.light[token] = light;
    palette.dark[token] = dark;
  }
  return palette;
}

/** Un texto como cadena CSS: las comillas, las barras y los saltos de línea no cierran la cadena. */
function cssString(text: string) {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\A ')}"`;
}

function declare(colors: Record<string, string>) {
  return Object.entries(colors)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(' ');
}

/** Hoja con la que el navegador pinta `sitemap.xml` para las personas: CSS sobre los elementos del XML, sin XSLT (Chrome lo retira). */
export function sitemapCss(text: { title: string; note: string }, palette: Palette): string {
  return `@namespace xhtml url(http://www.w3.org/1999/xhtml);

:root { color-scheme: light dark; ${declare(palette.light)} background: var(--canvas); }
@media (prefers-color-scheme: dark) { :root { ${declare(palette.dark)} } }

urlset, sitemapindex {
  display: block; max-width: 62rem; margin: 0 auto; padding: 2.5rem 1rem 4rem;
  color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, sans-serif;
  counter-reset: url;
}
urlset::before, sitemapindex::before {
  content: ${cssString(text.title)}; display: block; margin-bottom: 1.5rem;
  font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em;
}
urlset::after, sitemapindex::after {
  content: ${cssString(text.note)}; display: block; margin-top: 2rem;
  color: var(--faint); font-size: 0.875rem; white-space: pre-line;
}

url, sitemap {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.5rem;
  padding: 0.75rem 0; border-bottom: 1px solid var(--rule); counter-increment: url;
}
url::before, sitemap::before { content: counter(url); flex: 0 0 2.5rem; color: var(--faint); font-variant-numeric: tabular-nums; }
loc { flex: 1 1 calc(100% - 3rem); min-width: 0; color: var(--accent); overflow-wrap: anywhere; }
lastmod, changefreq, priority { display: none; }

xhtml|link {
  display: inline-block; padding: 0 0.4rem; border: 1px solid var(--rule); border-radius: 0.25rem;
  color: var(--muted); font-size: 0.75rem;
}
xhtml|link::before { content: attr(hreflang); }
loc + xhtml|link { margin-left: 3rem; }
`;
}
