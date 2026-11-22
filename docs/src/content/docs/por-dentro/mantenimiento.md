---
seo:
  title: "Mantenimiento: comandos, convenciones, tests y recetas"
  description: "Los comandos del repo, las convenciones de código y commits, la política de tests y dónde vive cada uno, y los pasos para añadir un componente, una opción, un texto o un idioma."
---

# Mantenimiento

Esta página reúne lo que necesitas para trabajar en el repo: los comandos, las convenciones, cómo se
prueba y los pasos de los cambios habituales.

## Comandos

Requisitos: Node `>=22.23.4` (la CI usa Node 24). Un `npm install` en la raíz instala la librería y los
dos workspaces. Todo se ejecuta desde la raíz:

::::tabs
:::tab[Desarrollo]
| Comando | Qué hace |
| --- | --- |
| `npm run docs:dev` | Este sitio, con recarga al editar `src/`. |
| `npm run playground:dev` | El playground. |
| `npm run dev` | La página mínima de la raíz, sin la integración. |
| `npm run docs:build` / `playground:build` | Build completo, con índice de búsqueda. |
:::
:::tab[Tests]
| Comando | Qué hace |
| --- | --- |
| `npm test` / `npm run test:watch` | Vitest, una vez o en vigilancia (tests de `src/` y `scripts/`). |
| `npm run test:coverage` | Vitest con cobertura de V8 (lo que ejecuta la CI). |
| `npm run test:mutation` | Stryker: mide si los tests notan un cambio en el código. |
:::
:::tab[Calidad]
| Comando | Qué hace |
| --- | --- |
| `npm run lint` | ESLint, con la regla de capas. |
| `npm run format` / `format:check` | Prettier escribe o solo comprueba. No toca los `.md`, que se ajustan a mano. |
| `npm run check` | `astro check`: los tipos de `.ts` y `.astro`. |
| `npm run docs:check` / `playground:check` | `astro check` de este sitio o del playground. |
:::
::::

La CI (`ci.yml`) ejecuta `lint`, `format:check`, `check`, `docs:check` y `test:coverage` en cada push y
pull request a `main`. `docs.yml` construye y despliega este sitio en cada push a `main`.

## Convenciones

- **Código en inglés; comentarios, errores, tests y documentación en español.** Los comentarios
  explican el **porqué**, y los `describe`/`it` se leen como frases.
- **Commits convencionales** (`feat(nav): …`, `fix(theme): …`): el ámbito es la zona tocada y el
  asunto describe el comportamiento que cambia.
- **Sin `enum`** (el paquete publica `.ts` sin compilar): objetos `as const` con su tipo derivado.
- **Valores cerrados exportados** desde `@velezanthony/design/integration`, con su tipo y su esquema
  (`z.enum(Object.values(X))`); `public-api.test.ts` lo vigila (regla N12).
- **Errores que ayudan:** un `DocsError` con archivo, línea y pista, acumulados para mostrarlos todos.
  Nunca se imprimen datos que no hagan falta (como el valor de `PUBLIC_GTM_ID`).
- **Estricto por defecto:** si algo no puede funcionar, rompe el build; si es mejorable, avisa.
- **Parámetros por objeto** (N9): dos o más opcionales van en un objeto con nombre
  (`buildListing({ context, contentLocale, folder, details })`).
- **Lo que el CSS no distingue se marca en el HTML, en positivo** (N8): una captura es
  `p.docs-screenshot`.
- **Tailwind vía `@apply`** en `theme.css`; CSS plano solo donde Tailwind no llega. `_local/` es para
  ficheros de trabajo que no se suben.

Los códigos N son las reglas de [Estructura](./estructura.md#las-reglas-numeradas).

## Tests

- **TDD estricto para la lógica:** todo lo que decide algo (una URL, un orden, una validación, un
  estado del cliente) se escribe test primero.
- **Sin tests para lo visual u obvio.** Del CSS solo se prueban **contratos**: ratios de contraste,
  que las dos paletas oscuras coincidan, que no haya colores literales, que el `@source` apunte a
  `src/`.
- Los tests viven junto a su archivo y describen el comportamiento en español.

| Tipo | Dónde | Cómo |
| --- | --- | --- |
| Núcleo puro | `core/**/*.test.ts` | Entra un dato, sale un dato. |
| Cliente | `client/**/*.test.ts` | El entorno inyectado (`Storage`, `matchMedia`, documento de linkedom). |
| Componentes | `components/**/*.test.ts` | `render()` y `text()` de `testing/render.ts`; textos con `stringsFor()`. |
| Plugins de Markdown | `astro/markdown/*.test.ts` | `testing/markdown.ts`. |
| Vistas | `astro/views/*.test.ts` | Funciones puras sobre una config resuelta; doble de `astro:content` en `testing/astro-content.ts`. |
| Build completo | `astro/integration/builds/` | `astro build` real de fixtures o de casos descritos como datos (`testing/case.ts`). Son los lentos. |
| Enlaces de un listado (N2) | `astro/views/doc-listing.test.ts`, `builds/indexes.test.ts` | Cada enlace del paginador y del selector es una ruta que existe. |
| Tipos de la config (N15) | `testing/config-types.ts` | No se ejecuta: lo comprueba `npm run check`, con `// @ts-expect-error` en lo que debe rechazar. |
| Guardas del repo | `testing/boundaries.test.ts`, `testing/package-contents.test.ts`, `components/styles/theme.test.ts`, `components/coupling.test.ts` | Fallan si alguien relaja una regla. |
| Scripts | `scripts/**/*.test.ts` | Transformaciones puras. |

- **Inyecta el entorno** (`BootEnv`, `LayoutEnv`, `ConsentEnv`) en vez de simular globales.
- **Dobles validados:** se construyen con el `docsSchema()` y el plugin reales.
- **Errores agregados:** comprueba que salen todos los fallos con su ruta, no solo el primero.

```sh
npx vitest run src/core/navigation         # una carpeta
npx vitest run -t "sin editUrl"            # por nombre
npx vitest run --exclude '**/builds/**'    # solo los rápidos
```

:::note[Mutación]{collapsed}
Mutar todo son unos 12 000 mutantes y horas; en local, acótalo con
`npx stryker run --mutate "src/core/shared/text.ts"`. Stryker guarda lo medido en
`.stryker-cache/incremental.json`. En CI, el workflow **Mutation** (manual, sobre `main`) reparte el
trabajo en trozos y guarda la base en la caché; **Mutation incremental** corre en los PR y en cada push
a `main` reutilizando esa base, y es informativo. Sin base en la caché, lanza antes el manual.
:::

## Recetas

En todas el orden es el mismo: **test primero** donde haya lógica, después el código, después la
documentación.

:::note[Un componente]{collapsed}
1. **Elige el nivel:** `atoms/` (pieza indivisible), `molecules/` (unas pocas piezas con un propósito)
   u `organisms/` (una zona de la página, que **solo compone**: N10).
2. **Todo llega por props**, textos incluidos (`strings` y `translate(strings, 'clave')`). Un
   componente no importa `astro:*`, `virtual:*` ni `src/astro/`: ESLint lo impide.
3. **Estilos** con utilidades y tokens, nunca colores literales; lo largo, en `theme.css` con `@apply`.
4. **Comportamiento en el navegador:** una función `init*` en `src/client/`, llamada desde `bootDocs` o,
   si es del contenido, desde `bootArticle`. Sus textos viajan en atributos `data-*`.
5. **Si tiene lógica**, su modelo de vista es una función pura en `core/<dominio>/view.ts` (N1), con
   test, y las URLs le llegan por un puerto de `astro/views/`.
6. Test en `<Componente>.test.ts` si tiene lógica de render, y su línea en el [mapa de `src/`](./estructura.md#el-mapa-de-src).

Los componentes se exportan solos por `@velezanthony/design/components/*`.
:::

:::note[Una opción de configuración]{collapsed}
1. **Su grupo** (N13): `site`, `i18n` o `content`; si cambia por carpeta, `content.folders` (N11). Añade
   el campo al esquema del grupo (es `strictObject`) y su test en `schema.test.ts`. Las validaciones
   que cruzan grupos van en el `superRefine` de `schema.ts`. Los tipos salen del esquema (N5).
2. **Valores cerrados** (N12): un objeto `as const`, su tipo y su esquema, exportado desde
   `src/astro/integration/index.ts` con su caso en `public-api.test.ts`.
3. **Valor por defecto** en el `resolve*` del grupo, no en el esquema (test en `resolve.test.ts`).
4. **Módulo virtual:** añade el tipo a mano en `src/astro/virtual/virtual.d.ts`.
5. **Uso:** pide solo tu parte con `ConfigPick`; lo que depende de las páginas se valida en el loader.
6. **No en el frontmatter** (N14). **Tipos públicos** (N15): su caso en `src/testing/config-types.ts`.
7. **Documentación:** su fila en la [lista de opciones](../guia/opciones.md) y, si
   cambia cómo se usa, su guía. Pruébala en el playground o en este sitio.
:::

:::note[Un texto de interfaz]{collapsed}
Añade la clave (estable y con espacio de nombres, `'footer.report'`) a los catálogos `en` y `es` de
`src/core/i18n/ui-strings.ts`; `ui-strings.test.ts` exige que exista en todos los idiomas. Las
variables se escriben `{nombre}`. El esquema de `i18n.ui` se genera desde las claves, así que los sitios
ya pueden sobrescribirla.
:::

:::note[Un idioma nuevo]{collapsed}
Añade su catálogo completo a `ui-strings.ts` (y a `defaultStrings` y `localeNames`). El test de
completitud te dirá qué falta.
:::

## Siguiente paso

Los colores y tokens que usan los componentes: [Paleta y tokens](./paleta.md).
