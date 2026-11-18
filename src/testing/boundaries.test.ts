import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/* Cada caso es un fragmento en memoria con la ruta que tendría en la capa que se comprueba.
   Si alguien relaja una regla de `eslint.config.mjs`, el caso correspondiente deja de fallar. */

const RULE = '@typescript-eslint/no-restricted-imports';
const NO_ENUM = 'no-restricted-syntax';
const eslint = new ESLint({ overrideConfigFile: resolve('eslint.config.mjs') });

/** Devuelve cuántas veces salta la regla indicada sobre el fragmento. */
async function violations(filePath: string, code: string, rule = RULE): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: resolve(filePath) });
  if (!result) throw new Error('ESLint no devolvió resultado');
  return result.messages.filter((message) => message.ruleId === rule).length;
}

const CORE = 'src/core/content/slug.ts';
const CLIENT = 'src/client/theme.ts';
const UI = 'src/components/organisms/Header.ts';
const ASTRO = 'src/astro/loader/index.ts';

const forbidden: [string, string, string][] = [
  ['core/ no importa astro:content', CORE, `import { getCollection } from 'astro:content';`],
  ['core/ no importa astro', CORE, `import { defineConfig } from 'astro';`],
  ['core/ no importa astro/loaders', CORE, `import { glob } from 'astro/loaders';`],
  ['core/ no importa virtual:*', CORE, `import cfg from 'virtual:@velezanthony/design/config';`],
  ['core/ no importa node:*', CORE, `import { readFile } from 'node:fs/promises';`],
  ['core/ no importa ../components', CORE, `import { x } from '../../components/atoms/Link';`],
  ['core/ no importa ../client', CORE, `import { x } from '../../client/theme';`],
  ['core/ no importa ../astro', CORE, `import { x } from '../../astro/loader';`],
  ['client/ no importa valores de core/', CLIENT, `import { x } from '../core/i18n/locale';`],
  ['client/ no importa components/', CLIENT, `import { x } from '../components/atoms/Link';`],
  ['client/ no importa astro/ (carpeta)', CLIENT, `import { x } from '../astro/loader';`],
  ['client/ no importa astro:*', CLIENT, `import { x } from 'astro:content';`],
  [
    'client/ no importa virtual:*',
    CLIENT,
    `import cfg from 'virtual:@velezanthony/design/config';`,
  ],
  [
    'components/ no importa virtual:*',
    UI,
    `import cfg from 'virtual:@velezanthony/design/config';`,
  ],
  ['components/ no importa astro:content', UI, `import { getCollection } from 'astro:content';`],
  ['components/ no importa astro', UI, `import { defineConfig } from 'astro';`],
  ['components/ no importa ../astro (carpeta)', UI, `import { x } from '../../astro/routes/doc';`],
];

const allowed: [string, string, string][] = [
  ['core/ sí importa astro/zod', CORE, `import { z } from 'astro/zod';`],
  ['core/ sí importa otro archivo de core/', CORE, `import { x } from '../i18n/locale';`],
  [
    'client/ sí importa tipos de core/',
    CLIENT,
    `import type { Locale } from '../core/i18n/locale';`,
  ],
  [
    'client/ sí importa tipos en línea de core/',
    CLIENT,
    `import { type Locale } from '../core/i18n/locale';`,
  ],
  ['components/ sí importa core/', UI, `import { translate } from '../../core/i18n/ui-strings';`],
  ['components/ sí importa client/', UI, `import { x } from '../../client/theme';`],
  ['astro/ sí importa astro:content', ASTRO, `import { getCollection } from 'astro:content';`],
  ['astro/ sí importa astro', ASTRO, `import { defineConfig } from 'astro';`],
  ['astro/ sí importa astro/loaders', ASTRO, `import { glob } from 'astro/loaders';`],
  ['astro/ sí importa virtual:*', ASTRO, `import cfg from 'virtual:@velezanthony/design/config';`],
  ['astro/ sí importa valores de core/', ASTRO, `import { x } from '../../core/i18n/locale';`],
  ['astro/ sí importa components/', ASTRO, `import { x } from '../../components/atoms/Link';`],
  ['astro/ sí importa client/', ASTRO, `import { x } from '../../client/theme';`],
];

describe('fronteras entre capas', () => {
  it.each(forbidden)(
    '%s',
    async (_name, filePath, code) => {
      expect(await violations(filePath, code)).toBeGreaterThan(0);
    },
    30_000,
  );

  it.each(allowed)(
    '%s',
    async (_name, filePath, code) => {
      expect(await violations(filePath, code)).toBe(0);
    },
    30_000,
  );
});

/* `enum` de TypeScript no es sintaxis borrable y publicamos `.ts` sin build: los valores cerrados
   son un objeto `as const` con su tipo derivado. */
const layers: [string, string][] = [
  ['core/', CORE],
  ['client/', CLIENT],
  ['components/', UI],
  ['astro/', ASTRO],
];

describe('sin enum de TypeScript', () => {
  it.each(layers)(
    '%s rechaza `enum` y `const enum`',
    async (_layer, filePath) => {
      expect(await violations(filePath, `enum Kind { A, B }`, NO_ENUM)).toBe(1);
      expect(await violations(filePath, `export const enum Kind { A = 'a' }`, NO_ENUM)).toBe(1);
    },
    30_000,
  );

  it.each(layers)(
    '%s admite un objeto `as const` con tipo derivado',
    async (_layer, filePath) => {
      const code = `export const Kind = { A: 'a', B: 'b' } as const;
export type Kind = (typeof Kind)[keyof typeof Kind];`;
      expect(await violations(filePath, code, NO_ENUM)).toBe(0);
    },
    30_000,
  );
});
