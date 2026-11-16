// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/* Regla de dependencia entre capas (ver `design.md`). Cada capa declara qué NO puede importar:

     core/    solo `core/` y `astro/zod` (la única excepción: el esquema de la config). Nada de
              `astro`, `astro:*`, `virtual:*`, `node:*` ni de `client/`, `ui/` o `astro/`.
     client/  solo tipos de `core/` (`import type`); nunca valores, ni `ui/`, `astro/`, `astro:*`
              ni `virtual:*`.
     ui/      `core/` y `client/` sí; `astro` y `astro:*` (incluido `astro:content`), `virtual:*` y
              la carpeta `astro/` no: es presentacional y solo recibe props.
     astro/   sin restricciones: es la única capa que conoce Astro.

   Los imports relativos se detectan por expresión regular sobre el nombre de la carpeta; los
   paquetes y esquemas (`astro:*`, `virtual:*`, `node:*`), por patrón. El test
   `src/testing/boundaries.test.ts` comprueba cada regla: si alguien la relaja, falla. */

/** Import relativo que entra en alguna de las carpetas dadas, p. ej. `../../ui/atoms/Link`. */
const relativeTo = (/** @type {string[]} */ folders) =>
  `^\\.{1,2}/(.*/)?(${folders.join('|')})(/|$)`;

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

/** @returns {import('eslint').Linter.Config} */
const layer = (
  /** @type {string} */ folder,
  /** @type {object[]} */ paths,
  /** @type {object[]} */ patterns,
) => ({
  files: [`src/${folder}/**/*.{ts,astro}`],
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths, patterns }] },
});

/* Sin linting con tipos: `astro check` ya es el dueño de los tipos, y el parser tendría que
   escribir un `.tsx` por cada `.astro` para comprobarlos. */
export default defineConfig(
  { ignores: ['**/dist/', '**/.astro/', '_local/'] },

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
      regex: relativeTo(['client', 'ui', 'astro']),
      message: 'El núcleo no depende de `client/`, `ui/` ni `astro/`.',
    },
  ]),
  layer('client', astroPackage, [
    {
      regex: relativeTo(['core']),
      allowTypeImports: true,
      message: 'Desde `client/` solo se importan tipos de `core/` (`import type`).',
    },
    {
      regex: relativeTo(['ui', 'astro']),
      message: '`client/` no depende de `ui/` ni de `astro/`.',
    },
    noAstroScheme,
    noVirtual,
  ]),
  layer('ui', astroPackage, [noAstroScheme, noVirtual, noAstroFolder]),

  /* Valores cerrados: nada de `enum` de TypeScript. No es sintaxis borrable y publicamos `.ts` sin
     build. En su lugar, un objeto `as const` más un tipo derivado:

       export const Kind = { A: 'a', B: 'b' } as const;
       export type Kind = (typeof Kind)[keyof typeof Kind];  */
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

  /* El último, para que el formato sea cosa solo de Prettier. */
  prettier,
);
