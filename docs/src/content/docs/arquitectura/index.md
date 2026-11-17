---
order: 1
---

# Capas

`src/` se divide en cuatro capas con una **regla de dependencia** estricta, más una carpeta de
utilidades de test. La idea es la de una arquitectura hexagonal: la lógica que decide (qué URL tiene
una página, qué va en la barra lateral, qué etiquetas lleva el head) no sabe nada de Astro ni del
navegador, y por eso se puede probar con tests unitarios rápidos y sin montar nada.

| Capa | Qué contiene | Puede importar |
| --- | --- | --- |
| `core/` | Lógica pura: config, contenido, enlaces, navegación, i18n, SEO, analítica, privacidad. | Solo `core/` y `astro/zod`. |
| `client/` | JavaScript del navegador: tema, búsqueda, consentimiento, pestañas, zoom… | Solo **tipos** de `core/` (`import type`). |
| `ui/` | Componentes `.astro` presentacionales y estilos. Reciben props, no buscan datos. | `core/` y `client/`. Nada de `astro`, `astro:*`, `virtual:*` ni la carpeta `astro/`. |
| `astro/` | El adaptador: integración, loader, plugins de Markdown, rutas, módulo virtual. | Todo. Es la única capa que conoce Astro. |
| `testing/` | Utilidades de test (no se distribuye). | Todo. |

```mermaid
flowchart TD
  astro["astro/<br/>integración · loader · markdown · rutas · virtual"]
  ui["ui/<br/>átomos · moléculas · organismos · layouts · estilos"]
  client["client/<br/>scripts de navegador"]
  core["core/<br/>lógica pura"]
  ext["astro, astro:*, virtual:*, node:*"]
  zod["astro/zod"]

  astro --> ui
  astro --> client
  astro --> core
  astro --> ext
  ui --> client
  ui --> core
  client -. "solo import type" .-> core
  core --> zod
```

Las flechas son las únicas direcciones permitidas. Fíjate en lo que **no** hay:

- `core/` no apunta a nada salvo a zod: ni Node (`node:*`), ni Astro, ni el módulo virtual. Es puro.
- `client/` no importa valores del núcleo. El código de navegador se empaqueta para el cliente, y
  arrastrar valores de `core/` metería en el bundle código que no pinta nada en el navegador. Los
  datos que necesita le llegan por atributos `data-*` del HTML.
- `ui/` no ve `astro/`: un componente no lee la colección ni el módulo virtual. Eso lo hacen los
  **contenedores** de `astro/routes/` (patrón contenedor/presentacional).

## Cómo lo hace cumplir ESLint

La regla vive en `eslint.config.mjs`, con `@typescript-eslint/no-restricted-imports` aplicada por
carpeta mediante una función `layer(folder, paths, patterns)`:

- Los imports **relativos** se detectan con una expresión regular sobre el nombre de la carpeta
  (`relativeTo(['client', 'ui', 'astro'])` atrapa `../../ui/atoms/Link`).
- Los **esquemas** (`astro:*`, `virtual:*`, `node:*`) se bloquean por patrón.
- El paquete `astro` va por `paths` (coincidencia exacta). Como patrón, `astro` también atraparía
  `astro/zod`, y un patrón no puede volver a permitir algo que cuelga de una carpeta ya excluida.
- En `client/`, la regla de `core/` lleva `allowTypeImports: true`: los `import type` pasan, los
  valores no.

Y para que nadie relaje una regla sin darse cuenta, `src/testing/boundaries.test.ts` lintea
fragmentos en memoria con la ruta que tendrían en cada capa y comprueba que cada import prohibido
**sigue saltando** (y que los permitidos no). Si alguien borra una regla de `eslint.config.mjs`, el
test correspondiente falla.

## El resto de reglas de ESLint

- **Sin `enum`.** El paquete publica `.ts` sin compilar y `enum` no es sintaxis borrable. En su
  lugar, un objeto `as const` más un tipo derivado:

  ```ts
  export const MissingTranslation = { LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' } as const;
  export type MissingTranslation = (typeof MissingTranslation)[keyof typeof MissingTranslation];
  ```

  Así están `MissingTranslation`, `PanelState`, `LayoutWidth` y `NavIcon`.
- **Sin linting con tipos.** `astro check` ya es el dueño de los tipos, y el parser tendría que
  generar un `.tsx` por cada `.astro`.
- **Accesibilidad.** `eslint-plugin-astro` con su configuración `jsx-a11y-recommended`.
- **Formato.** `eslint-config-prettier` va el último: el formato es solo cosa de Prettier.
- `playground/` está en `ignores`: es un consumidor con sus propias comprobaciones.

## Por qué así

- **Tests rápidos y fiables.** Casi toda la lógica está en `core/` y se prueba con funciones puras.
  Lo que necesita Astro se prueba con el contenedor de Astro (`testing/render.ts`) o con builds de
  fixtures.
- **Un solo sitio que cambia con Astro.** Cuando Astro cambia una API, el impacto queda en
  `astro/`. El resto no lo nota.
- **Componentes reutilizables.** Como `ui/` solo recibe props, un componente se puede renderizar en
  un test o en otra página sin montar la colección ni el módulo virtual.

Sigue con el [mapa de `src/`](./mapa-de-src.md).
