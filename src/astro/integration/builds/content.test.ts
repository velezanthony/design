import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { buildFailingCase } from '../../../testing/case';

const contentEntry = resolve('src/astro/content/index.ts');

/* `@velezanthony/design/content` toma la config del módulo virtual de la integración. El caso feliz
   lo cubre `short-form.test.ts` (su fixture usa la forma corta) y la forma explícita sigue en
   `basic.test.ts` (fixture `basic`): aquí, el único fallo propio de la forma corta. */

describe('@velezanthony/design/content sin la integración', { timeout: 120_000 }, () => {
  it('falla diciendo que falta docs(config) en astro.config.mjs', async () => {
    const { code, output } = await buildFailingCase({
      name: 'content-without-integration',
      config: { name: 'Sin integración' },
      docs: { 'index.md': '# Home\n' },
      extra: {
        'astro.config.mjs': `import { defineConfig } from 'astro/config';
export default defineConfig({ site: 'https://example.dev' });
`,
        /* Ruta absoluta y no relativa: el caso se escribe en una carpeta temporal y una ruta con
           `../` contados a mano se rompe en silencio cada vez que se mueve el test o los fixtures. */
        'src/content.config.ts': `export { collections } from '${contentEntry}';\n`,
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('docs(config)');
    expect(output).toContain('astro.config.mjs');
  });
});
