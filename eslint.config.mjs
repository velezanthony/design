// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/* Dependencia entre capas (ver `design.md`): cada capa declara lo que NO puede importar, y `astro/` además por subcarpeta; `src/testing/boundaries.test.ts` fija cada regla. */

/** Import relativo que entra en alguna de las carpetas dadas, p. ej. `../../components/atoms/Link`. */
function relativeTo(/** @type {string[]} */ folders) {
  return `^\\.{1,2}/(.*/)?(${folders.join('|')})(/|$)`;
}

/** Import relativo cuyo primer tramo tras los `../` es una de las carpetas dadas: distingue `../data` (la subcapa) de `../virtual/data`. */
function siblingOf(/** @type {string[]} */ folders) {
  return `^(\\.\\./)+(${folders.join('|')})(/|$)`;
}

/* El paquete `astro` va por `paths` (coincidencia exacta): como patrón, `astro` también atraparía
   `astro/zod`, y un patrón no puede reincorporar lo que cuelga de una carpeta ya excluida. */
const astroPackage = [{ name: 'astro', message: 'Solo `astro/` conoce Astro.' }];
const noAstroScheme = {
  group: ['astro:*'],
  message: 'Solo `astro/` conoce Astro.',
};
const noVirtual = {
  group: ['virtual:*'],
  message: 'El módulo virtual solo lo lee `astro/`.',
};
const noAstroFolder = {
  regex: relativeTo(['astro']),
  message: 'Nada fuera de `astro/` puede importar la carpeta `astro/`.',
};

/* Valla de dev: lo publicado no importa nada de `seo-on-page` (el panel solo existe en desarrollo). */
const noSeoOnPage = {
  regex: relativeTo(['seo-on-page']),
  message: 'Lo publicado no importa `seo-on-page`: el panel es solo de desarrollo.',
};

/** @returns {import('eslint').Linter.Config} */
function layer(
  /** @type {string} */ folder,
  /** @type {object[]} */ paths,
  /** @type {object[]} */ patterns,
  /** @type {string[]} */ ignores = [],
) {
  return {
    files: [`src/${folder}/**/*.{ts,astro}`],
    ignores,
    rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths, patterns }] },
  };
}

/* Sin linting con tipos: `astro check` ya es el dueño de los tipos, y el parser tendría que
   escribir un `.tsx` por cada `.astro` para comprobarlos. */
export default defineConfig(
  { ignores: ['**/dist/', '**/.astro/', '_local/', 'playground/', 'docs/', '**/.cases/'] },

  js.configs.recommended,
  tseslint.configs.recommended,
  /* Fija el parser de Astro, TypeScript dentro de él y el procesador del `<script>` de cliente. */
  astro.configs.recommended,
  /* Resuelve a `eslint-plugin-jsx-a11y-x`: el plugin original se queda en ESLint 9. */
  astro.configs['jsx-a11y-recommended'],

  { languageOptions: { globals: { ...globals.node } } },
  { files: ['**/*.astro'], languageOptions: { globals: { ...globals.browser } } },

  layer('core', astroPackage, [
    noAstroScheme,
    {
      /* `astro/zod` queda fuera de la lista negra con la negación del final. */
      group: ['astro/*', '!astro/zod'],
      message: 'El núcleo solo importa `astro/zod`.',
    },
    noVirtual,
    { group: ['node:*'], message: 'El núcleo es puro: sin Node.' },
    {
      regex: relativeTo(['client', 'components', 'astro']),
      message: 'El núcleo no depende de `client/`, `components/` ni `astro/`.',
    },
  ]),
  layer(
    'client',
    astroPackage,
    [
      {
        regex: relativeTo(['core']),
        allowTypeImports: true,
        message: 'Desde `client/` solo se importan tipos de `core/` (`import type`).',
      },
      {
        regex: relativeTo(['components', 'astro']),
        message: '`client/` no depende de `components/` ni de `astro/`.',
      },
      noAstroScheme,
      noVirtual,
      noSeoOnPage,
    ],
    ['src/client/seo-on-page/**'],
  ),
  layer('client/seo-on-page', astroPackage, [
    {
      regex: relativeTo(['core']),
      allowTypeImports: true,
      message: 'Desde `client/` solo se importan tipos de `core/` (`import type`).',
    },
    {
      regex: relativeTo(['components', 'astro']),
      message: '`client/` no depende de `components/` ni de `astro/`.',
    },
    noAstroScheme,
    noVirtual,
  ]),
  layer(
    'components',
    astroPackage,
    [noAstroScheme, noVirtual, noAstroFolder, noSeoOnPage],
    ['src/components/seo-on-page/**'],
  ),
  layer('components/seo-on-page', astroPackage, [noAstroScheme, noVirtual, noAstroFolder]),

  /* Subcapas de `astro/`: datos y presentación no se importan entre sí; solo `routes/` conoce a las dos. */
  layer('astro/views', astroPackage, [
    noAstroScheme,
    {
      regex: siblingOf(['data']),
      message: '`views/` no lee datos: recibe lo que necesita por parámetros.',
    },
    {
      regex: siblingOf(['components']),
      message: 'Solo `routes/` conoce a la vez los datos y los componentes.',
    },
  ]),
  layer(
    'astro/loader',
    [],
    [
      {
        regex: siblingOf(['integration']),
        message: 'El loader no depende de `integration/`.',
      },
    ],
  ),
  layer(
    'astro/data',
    [],
    [
      {
        regex: siblingOf(['routes', 'components']),
        message: '`data/` no depende de `routes/` ni de `components/`.',
      },
    ],
  ),
  layer('astro/routes', [], [noSeoOnPage], ['src/astro/routes/seo-on-page/**']),

  /* Nada de `enum` de TypeScript (no es sintaxis borrable y publicamos `.ts` sin build): un objeto `as const` más un tipo derivado. */
  {
    files: ['src/**/*.{ts,astro}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            'Sin `enum`: usa un objeto `as const` y deriva el tipo (`(typeof X)[keyof typeof X]`).',
        },
      ],
    },
  },

  /* Las funciones de nivel módulo y las locales con nombre son declaraciones; la flecha queda para
     los callbacks en línea. */
  {
    files: ['**/*.{ts,mjs,astro}'],
    rules: { 'func-style': ['error', 'declaration', { allowArrowFunctions: false }] },
  },

  /* Los nombres de una letra no dicen qué son. */
  {
    files: ['**/*.{ts,mjs,astro}'],
    rules: { 'id-length': ['error', { min: 2, properties: 'never' }] },
  },

  /* Palabras enteras (nada de `cfg`, `ctx`, `el`); quedan fuera las claves públicas y el vocabulario de Astro/HTML (`dir`, `doc`, `fn`, `ref`, `src`…). */
  {
    files: ['**/*.{ts,mjs,astro}'],
    rules: {
      'id-denylist': [
        'error',
        'cfg',
        'ctx',
        'av',
        'el',
        'btn',
        'idx',
        'msg',
        'opts',
        'err',
        'tmp',
        'str',
        'obj',
        'arr',
        'val',
        'cb',
        'args',
        'ext',
        'pkg',
        'win',
        'bg',
        'fg',
        'cls',
        'dup',
        'hl',
        'kb',
        'reg',
        'pref',
        'abs',
        'act',
      ],
    },
  },

  /* El último, para que el formato sea cosa solo de Prettier. */
  prettier,
);
