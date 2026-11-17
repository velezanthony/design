import { describe, expect, it } from 'vitest';
import { buildFailingCase } from '../../testing/case';

/* `@velezanthony/design/content` toma la config del módulo virtual de la integración. El caso feliz
   lo cubre `build-mono.test.ts` (su fixture usa la forma corta) y la forma explícita sigue en
   `build.test.ts` (fixture `basic`): aquí, el único fallo propio de la forma corta. */

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
        'src/content.config.ts': `export { collections } from '../../../../../content/index.ts';\n`,
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('docs(config)');
    expect(output).toContain('astro.config.mjs');
  });
});
