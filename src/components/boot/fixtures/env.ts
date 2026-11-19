import { parseHTML } from 'linkedom';
import { vi } from 'vitest';

import type { BootEnv } from '../env';

export function env(html: string, extra: Partial<BootEnv> = {}): BootEnv {
  const { document } = parseHTML(
    `<!doctype html><html lang="en"><head></head><body>${html}</body></html>`,
  );
  return {
    htmlDocument: document,
    storage: undefined,
    system: { matches: false, addEventListener: vi.fn() },
    clipboard: { writeText: vi.fn(async () => {}) },
    hostname: 'x.dev',
    reload: vi.fn(),
    ...extra,
  };
}

export const content = `
  <button data-theme-toggle aria-pressed="false"></button>
  <main data-copy-label="Copiar" data-copied-label="Copiado" data-copy-failed-label="Error" data-anchor-label="Enlace a {title}" data-zoom-label="Ampliar: {alt}" data-zoom-close-label="Cerrar">
    <h2 id="a">Uno</h2>
    <div class="prose"><img src="/a.png" alt="Esquema" width="800" height="400"></div>
    <pre class="astro-code"><code>x</code></pre>
    <div class="docs-tabs"><div class="docs-tab-panel"><div class="docs-tab-label">A</div>a</div></div>
  </main>`;
