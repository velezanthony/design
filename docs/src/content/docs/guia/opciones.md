---
seo:
  title: "Referencia de configuración: todas las opciones"
  description: "Todas las opciones de defineDocsConfig para site, i18n y content, con su tipo y valor por defecto, más defineDocsSite y la forma explícita del loader."
---

# Todas las opciones

Esta página lista **todas** las opciones de `defineDocsConfig`, grupo a grupo. Para aprender a usarlas,
empieza por [Tu primer sitio](./primer-sitio.md#4-lo-básico-de-la-configuración); aquí está el
detalle de cada clave.

## Cómo se lee

La config tiene tres grupos: **`site`** (cómo se ve y se presenta el sitio), **`i18n`** (idiomas y
textos) y **`content`** (qué páginas hay y cómo se navega). Solo `site.name` es obligatorio.

- **Tipada.** `defineDocsConfig` no hace nada en tiempo de ejecución: solo da tipos, así que el editor
  autocompleta cada opción y marca las que no existen.
- **Estricta.** Una clave desconocida rompe el build indicando su ruta (`i18n.ui.es.search.placeholdr`).
- **Constantes.** Las opciones de valores cerrados son constantes exportadas por
  `@velezanthony/design/integration`: `ListingView`, `TreeShow`, `ALL_FOLDERS`, `MissingTranslation`,
  `PanelState`, `LayoutWidth` y `NavIcon`. Las cadenas literales (`'cards'`) también valen.
- **Textos traducibles.** Donde la tabla dice «texto», vale una cadena para todos los idiomas o un
  objeto por idioma (`{ es: 'Guía', en: 'Guide' }`); un idioma ausente usa el del idioma por defecto.

## `site`

| Opción | Tipo | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `site.name` | cadena | — (obligatorio) | Nombre del sitio: cabecera, pie y sufijo del título por defecto. |
| `site.favicon` | cadena | El icono del paquete | Icono de la pestaña: un archivo de `public/` (`'favicon.svg'` o `'/favicon.svg'`, debe existir) o una URL `https://`. Ver [El icono de la pestaña](./personalizar.md#el-icono-de-la-pestaña-sitefavicon). |
| `site.theme` | cadena | — | CSS propio, ruta desde la raíz del proyecto (`'src/styles/site.css'`, debe existir y acabar en `.css`): tokens `@theme` y estilos que se compilan junto al tema de la librería. Ver [CSS propio](./personalizar.md#css-propio-sitetheme). |
| `site.social.github` | cadena | — | URL del repositorio. Da los enlaces «Repositorio» e «Informar de un error» del pie. |
| `site.components.Footer` | cadena | El pie de la librería | Ruta de un `.astro` desde la raíz del proyecto que sustituye al pie. Es la única clave de `components`. Ver [Un pie propio](./personalizar.md#un-pie-propio-sitecomponentsfooter). |
| `site.footer.license` | cadena o `{ label, href }` | — | Licencia: solo el nombre (`'MIT'`) o con enlace `https://`. |
| `site.footer.author` | `{ name, href }` o `false` | Quien mantiene la librería | Firma del pie; `href` es `https://`. `false` la oculta. |
| `site.footer.links` | lista de `{ label, slug }` o `{ label, href }` | — | Enlaces del pie: una página (`slug`) o un enlace externo `https://` (`href`), solo uno de los dos. Ver [El pie](./personalizar.md#el-pie-de-las-páginas-de-docs-sitefooter). |
| `site.layout.sidebar` | `PanelState` (`OPEN`, `COLLAPSED`) | `OPEN` | Estado inicial de la barra lateral (desde `lg`). |
| `site.layout.toc` | `PanelState` | `OPEN` | Estado inicial de «En esta página» (desde `xl`). |
| `site.layout.width` | `LayoutWidth` (`READING`, `FULL`) | `READING` | Ancho de lectura o completo. |
| `site.layout.toggles` | booleano | `true` | `false` quita los controles de plegar y de ancho e ignora lo que guardó el visitante. |
| `site.layout.tocDepth` | entero de 2 a 6 | `3` | Último nivel de encabezado que lista «En esta página». |
| `site.layout.tocMaxHeight` | longitud CSS (`px`, `rem`, `em`, `vh`, `dvh`, `svh`) | Sin límite | Altura máxima del índice; pasada, la lista hace scroll por dentro. |
| `site.seo.titleSuffix` | texto o `false` | `site.name` | Sufijo del `<title>`. `false`: ninguno. Ver [El título](./idiomas-seo-y-analitica.md#la-base-del-sitio-y-lo-que-cambia-cada-página). |
| `site.seo.description` | texto | — | Descripción de las páginas que no traen la suya. |
| `site.seo.image` | `{ src, alt }` | — | Imagen al compartir: `src` en `public/` (`/og.png`) o `https://`; `alt` (texto) es obligatorio aquí. |
| `site.seo.schema` | lista de objetos JSON-LD | — | Datos estructurados de todas las páginas. Ver [JSON-LD](./idiomas-seo-y-analitica.md#datos-estructurados-json-ld). |
| `site.seo.ogLocales` | `{ [idioma]: 'idioma_TERRITORIO' }` | El propio idioma | `og:locale` con territorio (`{ es: 'es_ES' }`). Cada clave debe estar en `i18n.locales`. |
| `site.seo.sitemap.include` | lista de rutas o URLs del mismo origen | `[]` | Convierte `sitemap.xml` en un índice con otros sitemaps del dominio. Ver [Sitemap](./idiomas-seo-y-analitica.md#sitemapxml). |
| `site.analytics.gtmId` | cadena (`GTM-…`) | `PUBLIC_GTM_ID` del entorno | Contenedor de Google Tag Manager; gana al entorno. Ver [Analítica](./idiomas-seo-y-analitica.md#analítica-y-privacidad). |
| `site.analytics.privacyUrl` | URL o ruta del sitio, o una por idioma | — | Política de privacidad que enlazan el pie y el aviso de cookies. Obligatoria con analítica; sin analítica, solo pone el enlace del pie. |

## `i18n`

| Opción | Tipo | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `i18n.locales` | lista de idiomas | `['en']` | Idiomas del sitio. Solo `en` y `es` tienen textos de interfaz en el paquete. |
| `i18n.defaultLocale` | idioma | El primero de `locales` | Idioma de los archivos sin sufijo y de las URLs sin prefijo. |
| `i18n.missing` | `MissingTranslation` (`LINK`, `OMIT`, `FALLBACK`) | `LINK` | Qué ve quien navega en un idioma sin traducción. Ver [Varios idiomas](./idiomas-seo-y-analitica.md#cuando-falta-una-traducción-i18nmissing). |
| `i18n.ui` | `{ [idioma]: { [clave]: texto } }` | `{}` | Sobrescribe textos de interfaz, clave a clave (`{ es: { 'search.placeholder': 'Buscar' } }`). Una clave desconocida rompe el build. |

## `content`

| Opción | Tipo | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `content.dir` | ruta relativa | `'src/content/docs'` | Carpeta de las páginas nativas, relativa a la raíz del proyecto de Astro; puede estar fuera (`'../docs'`). Ver [Páginas fuera del proyecto](./navegacion.md#páginas-fuera-del-proyecto-de-astro-contentdir). |
| `content.exclude` | lista de patrones | `[]` | Patrones (estilo `.gitignore`) de los `.md` de `content.dir` que no se publican. Ver [Excluir archivos](./navegacion.md#excluir-archivos-contentexclude). |
| `content.external` | lista de `{ slug, file, locales?, seo?, translations? }` | `[]` | Archivos `.md` de fuera de la carpeta de contenido publicados como páginas. Ver [Archivos externos](./navegacion.md#archivos-externos-contentexternal). |
| `content.static` | lista de `{ from, to, exclude? }` | — | Carpetas que se publican tal cual. Ver [Carpetas estáticas](./navegacion.md#carpetas-estáticas-contentstatic). |
| `content.editUrl` | URL | — | Base de edición del repo (`https://github.com/o/r/edit/main`): añade «Editar esta página» apuntando al archivo fuente real. |
| `content.repoRoot` | ruta relativa | El ancestro más cercano con `.git` | Raíz del repo relativa al proyecto de Astro, para las rutas de `editUrl`. Necesaria cuando no hay `.git`. |
| `content.nav` | lista de secciones, páginas y enlaces | — | Elementos de la cabecera: `{ label, dir?, sidebar? }`, `{ label, slug }` o `{ label, href, icon? }`. Ver [Organizar la navegación](./navegacion.md#cabecera-y-barra-lateral). |
| `content.sidebar` | lista de slugs y grupos `{ label, slug?, items? }` | Árbol automático de carpetas | Orden de la barra lateral general. La portada es `'index'`. |
| `content.folders` | `{ [carpeta o '*']: { listing?, tree? } }` | `{}` | Ajustes por carpeta, heredados de padre a hijo (tabla de abajo). |

### `content.external[]`

| Campo | Qué hace |
| --- | --- |
| `slug` | Slug de la página, sin barras en los extremos. `'index'` es la portada; `'guia/index'` es `guia`. |
| `file` | Ruta local de un `.md`, relativa al proyecto de Astro (`'../CHANGELOG.md'`). |
| `locales` | Idiomas que deben existir (`CHANGELOG.es.md`…); cada uno debe estar en `i18n.locales`. |
| `seo` | El mismo bloque que el `seo` del [frontmatter](./escribir-paginas.md#frontmatter). |
| `translations` | Política de traducción de esta página (`MissingTranslation`). |

### `content.nav[]`

| Campo | Qué hace |
| --- | --- |
| `label` | Texto del elemento (texto traducible). |
| `dir` | Sección: la carpeta cuyas páginas le pertenecen, sin barras en los extremos. |
| `sidebar` | Sección: orden y páginas de su barra lateral (misma forma que `content.sidebar`). Solo en una sección. |
| `slug` | Página: el slug de una página que no es de ninguna sección. |
| `href` | Enlace externo `https://`. |
| `icon` | Solo en un enlace: `NavIcon.GITHUB` pinta el icono y deja el `label` para lectores de pantalla. |

### `content.folders`

Cada clave es la ruta de una carpeta del contenido sin barras (`articulos/python`) o `'*'`
(`ALL_FOLDERS`) para todo el sitio. Cada ajuste se hereda por separado de la carpeta declarada más
cercana, luego de `'*'` y luego del valor por defecto. Ver [Índices de carpeta](./navegacion.md#ajustes-por-carpeta-contentfolders).

| Opción | Tipo | Por defecto | Qué hace |
| --- | --- | --- | --- |
| `listing.generate` | booleano | `false` | Da a la carpeta (y a sus subcarpetas) una página índice generada. |
| `listing.view` | `ListingView` (`LIST`, `TABLE`, `CARDS`) | `LIST` | Cómo se pinta el listado. |
| `listing.pageSize` | entero de 1 a 500 | 12 en tarjetas, 10 en tabla | Entradas por página. La lista no se pagina. |
| `listing.perPageOptions` | lista de enteros de 1 a 500 | `[12, 24, 48]` o `[10, 25, 50]` | Opciones del selector «Por página»; `pageSize` se añade si falta. |
| `listing.covers` | booleano | `true` | `true`: la portada de la librería a quien no trae imagen. `false`: sin imagen. |
| `tree.show` | `TreeShow` (`SECTION`, `ALL`) | `SECTION` | Qué árbol lleva la barra lateral de las páginas de la carpeta. |
| `tree.depth` | entero positivo | Sin límite | Niveles de grupos de carpeta del árbol automático, contados desde la carpeta que lo declara. |

## Comprobaciones entre claves

Estas comprobaciones miran más de un grupo y rompen el build con la ruta completa:

- un idioma de `site.seo.ogLocales`, de `site.analytics.privacyUrl` o de `content.external[].locales`
  que no está en `i18n.locales`;
- un `i18n.defaultLocale` o un idioma de `i18n.ui` que no está en `i18n.locales`;
- dos `content.static[].to` que se solapan, o un `to` que es `_astro`, `pagefind` o un idioma.

## `defineDocsSite(docsConfig, options)`

La forma corta de `astro.config.mjs`. Devuelve la config de Astro.

| Opción | Por defecto | Qué hace |
| --- | --- | --- |
| `base` | — (obligatoria) | Ruta bajo la que se sirve el sitio: `'/mi-repo'` en una página de proyecto de GitHub Pages, `'/'` en un sitio de usuario u organización. Debe empezar por `/`. |
| `site` | `'https://velezanthony.github.io'` | Origen absoluto del sitio, para el sitemap y las URLs canónicas. |
| `astro` | — | Más config de Astro. `integrations` y `vite.plugins` se añaden después de `docs()`; el resto de claves de `vite` se fusionan en superficial y las demás claves de primer nivel pisan los valores por defecto (por ejemplo, `trailingSlash`, que por defecto es `'always'`). |

::::tabs
:::tab[Forma corta]
```js
export default defineDocsSite(docsConfig, {
  base: '/mi-repo',
  site: 'https://example.dev',
  astro: { integrations: [miIntegracion()], vite: { plugins: [miPlugin()] } },
});
```
:::
:::tab[Forma larga]
```js
import { defineConfig } from 'astro/config';
import { docs } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineConfig({
  site: 'https://example.dev', // obligatorio en la forma larga
  base: '/mi-repo',
  trailingSlash: 'always',
  integrations: [docs(docsConfig)], // registra también el plugin de Tailwind
});
```
:::
::::

- En la forma larga, `site` es **obligatorio**: sin él, la integración falla porque el sitemap y las
  URLs canónicas necesitan un origen absoluto.
- `markdown.processor` debe seguir siendo Sätteri: con otro procesador, `docs()` falla con un error
  claro.
- Editar `docs.config.mjs` reinicia `astro dev`.

## La colección (`content.config.ts`)

```ts
// src/content.config.ts
export { collections } from '@velezanthony/design/content';
```

Una línea, sin importar la config: la colección toma la que `docs(config)` ya resolvió. Necesita la
integración registrada; sin `docs(config)` en `astro.config.mjs`, el build falla con un error que lo
dice. La colección **tiene que llamarse `docs`**.

### Forma explícita del loader

Si necesitas montar la colección tú (por ejemplo, para añadir otra), usa `docsLoader` con el **mismo**
objeto que das a `docs()`:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { docsLoader, docsSchema } from '@velezanthony/design/loader';
import docsConfig from '../docs.config.mjs';

export const collections = {
  // `image` deja que las portadas relativas de los índices pasen por astro:assets.
  docs: defineCollection({
    loader: docsLoader(docsConfig),
    schema: ({ image }) => docsSchema(image),
  }),
};
```

Con `docsSchema()` a secas, una portada relativa cae a la de la librería.

## Siguiente paso

Si vienes de MkDocs: [Migrar desde MkDocs](./migrar-desde-mkdocs.md).
