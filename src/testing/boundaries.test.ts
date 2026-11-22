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
const VIEWS = 'src/astro/views/doc.ts';
const DATA = 'src/astro/data/site-config.ts';
const PANEL_DATA = 'src/astro/data/seo-on-page/adapter.ts';
const ROUTES = 'src/astro/routes/sitemap.xml.ts';
const PANEL_ROUTES = 'src/astro/routes/seo-on-page/overview.ts';
const PANEL_COMPONENTS = 'src/components/seo-on-page/molecules/Kpi.ts';
const PANEL_CLIENT = 'src/client/seo-on-page/boot.ts';
const LAYOUT = 'src/components/layouts/DocsLayout.ts';
const ORGANISM = 'src/components/organisms/content/Article.ts';

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
  /* Subcapas de `astro/`: datos y presentación no se importan entre sí. */
  ['data/ no importa views/', DATA, `import { x } from '../views/doc';`],
  ['data/ no importa tipos de views/', DATA, `import type { DocRoute } from '../views/doc';`],
  ['data/seo-on-page no importa routes/', PANEL_DATA, `import { x } from '../../routes/doc';`],
  ['data/seo-on-page no importa views/', PANEL_DATA, `import { x } from '../../views/pages';`],
  ['views/ no importa astro:content', VIEWS, `import { getCollection } from 'astro:content';`],
  ['views/ no importa astro', VIEWS, `import { defineConfig } from 'astro';`],
  ['views/ no importa data/', VIEWS, `import { x } from '../data/site-config';`],
  [
    'views/ no importa data/ desde su subcarpeta',
    VIEWS,
    `import { x } from '../../data/site-config';`,
  ],
  [
    'views/ no importa components/',
    VIEWS,
    `import { x } from '../../components/atoms/actions/Link';`,
  ],
  ['loader/ no importa integration/', ASTRO, `import { x } from '../integration/docs';`],
  ['data/ no importa routes/', DATA, `import { x } from '../routes/routes';`],
  [
    'data/ no importa components/',
    DATA,
    `import { x } from '../../components/atoms/actions/Link';`,
  ],
  /* Atomic Design: ningún nivel importa uno superior. */
  ['organisms/ no importa layouts/', ORGANISM, `import { x } from '../../layouts/boot';`],
  [
    'molecules/ no importa layouts/',
    'src/components/molecules/navigation/Toc.ts',
    `import { x } from '../../layouts/boot';`,
  ],
  [
    'atoms/ no importa layouts/',
    'src/components/atoms/display/Tag.ts',
    `import { x } from '../../layouts/BaseLayout';`,
  ],
  ['organisms/ no importa pages/', ORGANISM, `import { x } from '../../pages/DocPage';`],
  /* Valla de dev: lo publicado no toca el panel. */
  [
    'components/ no importa components/seo-on-page',
    LAYOUT,
    `import { x } from '../seo-on-page/atoms/Note';`,
  ],
  [
    'components/ no importa core/seo-on-page',
    UI,
    `import { x } from '../../core/seo-on-page/labels';`,
  ],
  ['client/ no importa client/seo-on-page', CLIENT, `import { x } from './seo-on-page/boot';`],
  ['routes/ no importa routes/seo-on-page', ROUTES, `import { x } from './seo-on-page/overview';`],
  [
    'routes/ no importa views/seo-on-page',
    ROUTES,
    `import { x } from '../views/seo-on-page/panel';`,
  ],
  [
    'routes/ no importa components/seo-on-page',
    ROUTES,
    `import { x } from '../../components/seo-on-page/pages/OverviewPage';`,
  ],
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
  [
    'organisms/ sí importa el arranque neutral',
    ORGANISM,
    `import { x } from '../../boot/article';`,
  ],
  ['components/ sí importa client/', UI, `import { x } from '../../client/theme';`],
  ['astro/ sí importa astro:content', ASTRO, `import { getCollection } from 'astro:content';`],
  ['astro/ sí importa astro', ASTRO, `import { defineConfig } from 'astro';`],
  ['astro/ sí importa astro/loaders', ASTRO, `import { glob } from 'astro/loaders';`],
  ['astro/ sí importa virtual:*', ASTRO, `import cfg from 'virtual:@velezanthony/design/config';`],
  ['astro/ sí importa valores de core/', ASTRO, `import { x } from '../../core/i18n/locale';`],
  ['astro/ sí importa components/', ASTRO, `import { x } from '../../components/atoms/Link';`],
  ['astro/ sí importa client/', ASTRO, `import { x } from '../../client/theme';`],
  ['views/ sí importa core/', VIEWS, `import { x } from '../../core/i18n/locale';`],
  ['views/ sí importa tipos de loader/', VIEWS, `import type { DocData } from '../loader/schema';`],
  [
    'views/ sí importa virtual/data',
    VIEWS,
    `import type { VirtualConfig } from '../virtual/data';`,
  ],
  ['views/ sí importa otra vista', VIEWS, `import { x } from './chrome';`],
  ['loader/ sí importa core/', ASTRO, `import { x } from '../../core/i18n/locale';`],
  ['data/ sí importa virtual/', DATA, `import { x } from '../virtual/data';`],
  [
    'routes/ sí importa data/, views/ y components/',
    ROUTES,
    `import { x } from '../data/site-config';
import { y } from '../views/doc';
import { z } from '../../components/pages/DocPage';`,
  ],
  [
    'routes/seo-on-page sí importa su panel',
    PANEL_ROUTES,
    `import { x } from '../../views/seo-on-page/panel';
import { y } from '../../../components/seo-on-page/pages/OverviewPage';`,
  ],
  [
    'components/seo-on-page sí importa core/seo-on-page',
    PANEL_COMPONENTS,
    `import { x } from '../../../core/seo-on-page/labels';`,
  ],
  [
    'components/seo-on-page sí importa a sus hermanos',
    PANEL_COMPONENTS,
    `import { x } from '../atoms/Note';`,
  ],
  [
    'client/seo-on-page sí importa tipos de core/seo-on-page',
    PANEL_CLIENT,
    `import type { x } from '../../core/seo-on-page/tree/types';`,
  ],
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
