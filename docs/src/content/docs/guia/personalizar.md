---
seo:
  title: "Personalizar: aspecto, páginas propias y componentes"
  description: "Cómo ajustar la disposición, el tema, tu CSS y el favicon, montar páginas con tu cabecera y tu pie, cambiar el pie de las páginas de docs y qué piezas exporta la librería."
---

# Personalizar

Al terminar esta página sabrás ajustar el aspecto del sitio, montar páginas con tu propia cabecera y
tu propio pie y usar las piezas que exporta la librería.

## Aspecto

### Disposición (`site.layout`)

```js
import { LayoutWidth, PanelState } from '@velezanthony/design/integration';

site: {
  layout: {
    sidebar: PanelState.OPEN, // o COLLAPSED: estado inicial de la navegación (desde lg)
    toc: PanelState.OPEN, // igual para «En esta página» (desde xl)
    width: LayoutWidth.READING, // o FULL
    toggles: true, // false quita los controles e ignora lo que guardó el visitante
    tocDepth: 3, // último nivel de «En esta página», de 2 a 6
    tocMaxHeight: '60vh', // opcional: pasada esa altura, el índice hace scroll por dentro
  },
},
```

- **`READING`** (por defecto) centra la página; **`FULL`** pega la barra lateral al borde y deja que el
  contenido llene el resto.
- Cada columna lateral se **pliega** en un raíl estrecho. Con un lado plegado o en `FULL`, el código,
  las tablas y las capturas ocupan toda la columna.
- La elección del visitante se guarda y se aplica antes de pintar, así que al recargar no hay saltos.
- Por debajo de `lg` la navegación está tras el botón «Menú».

### CSS propio (`site.theme`)

La librería es la dueña de Tailwind: no escribes tu propio `@import 'tailwindcss'`. Pon tus tokens y
estilos en un CSS y decláralo:

::::tabs
:::tab[docs.config.mjs]
```js
site: { theme: 'src/styles/site.css' }, // desde la raíz del proyecto; el archivo debe existir
```
:::
:::tab[src/styles/site.css]
```css
/* src/styles/site.css */
@theme {
  --color-aviso: light-dark(#92400e, #fbbf24);
}
```
:::
::::

- Se compila en la misma pasada que el tema de la librería, en último lugar: `@theme` genera utilidades
  (`text-aviso`) y puedes pisar lo anterior. Tailwind detecta solo las clases de tus archivos.
- No importes `theme.css` tú: ya lo carga la librería.
- Los tokens que puedes usar o pisar están en [Paleta y tokens](../por-dentro/paleta.md).

### El icono de la pestaña (`site.favicon`)

```js
site: { favicon: 'favicon.svg' }, // un archivo de public/, o una URL https
```

Sin él, se usa el icono del paquete. Un archivo de `public/` que no existe rompe el build. Los favicons
que trae el scaffold de Astro no se usan salvo que apuntes a ellos.

:::note[Tema, transiciones, zoom e impresión]{collapsed}
- **Tema claro/oscuro:** sin elección manda el sistema; el selector de la cabecera guarda la elección
  del visitante en `localStorage` (`theme`).
- **Transiciones:** al navegar, la cabecera y las barras se quedan quietas y el contenido entra con un
  fundido; el cambio de tema se revela con un círculo. Con movimiento reducido no hay ninguna.
- **Zoom:** las imágenes con `alt` se amplían al pulsarlas, salvo las decorativas, las enlazadas, las
  de menos de 96px y las que llevan `data-no-zoom`.
- **Impresión:** se ocultan el botón «volver arriba» y el aviso de cookies.
:::

## Páginas propias

### Una página sobre `BaseLayout`

`BaseLayout` pinta el documento y **nada más**: `<html>`, el `<head>`, el tema claro/oscuro y el aviso
de consentimiento. La cabecera, el pie y el diseño del `<body>` son tuyos. (Las páginas de docs usan
`DocsLayout`, construido sobre él.)

```astro
---
// src/pages/cv.astro
import BaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import ThemeToggle from '@velezanthony/design/components/molecules/controls/ThemeToggle.astro';
import Fonts from '@velezanthony/design/fonts';
import { pageHead } from '@velezanthony/design/seo';
import { designStrings } from '@velezanthony/design/site';

const strings = designStrings('es'); // textos de interfaz, ya con tus sobrescrituras
const head = await pageHead({
  title: 'Currículum',
  seo: { description: 'Mi currículum.' },
  locale: 'es',
  url: Astro.url.pathname,
});
---

<BaseLayout lang="es" head={head} bodyClass="flex min-h-dvh flex-col">
  <Fonts slot="head" />
  <header class="flex items-center justify-between px-6 py-4">
    <a href="/">Ana</a>
    <ThemeToggle strings={strings} />
  </header>
  <main id="main-content" class="mx-auto w-full max-w-3xl flex-1 px-6">
    <h1>Currículum</h1>
  </main>
  <footer class="px-6 py-4 text-sm text-muted">© 2026 Ana</footer>
  <script slot="scripts" src="/extra.js" is:inline></script>
</BaseLayout>
```

- **`pageHead`** calcula el `<head>` con la config del sitio: título con sufijo, descripción,
  canonical, `hreflang`, Open Graph y JSON-LD.
- **Ranuras:** lo que lleva `slot="head"` va al final del `<head>`; `slot="scripts"`, al final del
  `<body>`, cuando el tema y el consentimiento ya están cableados.
- **Con analítica,** pasa `gtmId` y `privacyUrl`, que `@velezanthony/design/site` te da ya resueltos
  (`gtmId` y `privacyUrl(locale)`).
- **Markdown con índice:** para pintar contenido Markdown con «En esta página» dentro de tu diseño, usa
  `Article`.

Las props de `BaseLayout`, `Article`, `pageHead` y el resto de piezas están en
[Componentes y props](#componentes-y-props).

### El pie de las páginas de docs (`site.footer`)

```js
site: {
  footer: {
    license: { label: 'MIT', href: 'https://github.com/o/r/blob/main/LICENSE' }, // o solo 'MIT'
    author: { name: 'Ana', href: 'https://ana.dev' }, // false lo oculta
    links: [
      { label: 'Cambios', slug: 'changelog' }, // una página
      { label: 'Blog', href: 'https://blog.dev' }, // externo, solo https
    ],
  },
},
```

- La primera fila lleva `© <año> <nombre> by <autor>`, tus `links`, y el repositorio e «Informar de un
  error» si das `site.social.github`. La segunda, la licencia, la privacidad y, con analítica, el botón
  «Preferencias de cookies».
- Sin `author`, firma quien mantiene la librería. Solo se pinta lo que existe.
- Rompe el build un `slug` que no es una página, un enlace con `slug` y `href` a la vez (o ninguno) y
  un `href` que no es `https://`.

### Un pie propio (`site.components.Footer`)

Si ya tienes un pie, úsalo también en las páginas de docs:

::::tabs
:::tab[docs.config.mjs]
```js
site: { components: { Footer: './src/components/DocsFooter.astro' } },
```
:::
:::tab[DocsFooter.astro]
```astro
---
// src/components/DocsFooter.astro
import type { FooterProps } from '@velezanthony/design/integration';
import CookieSettingsButton from '@velezanthony/design/components/atoms/actions/CookieSettingsButton.astro';

type Props = FooterProps;
const { siteName, year, strings, privacyUrl, cookieControl } = Astro.props;
---

<footer class="surface-inverse mt-auto px-6 py-8">
  <p>© {year} {siteName}</p>
  {privacyUrl && <a href={privacyUrl}>{strings['consent.privacy']}</a>}
  {cookieControl && <CookieSettingsButton strings={strings} />}
</footer>
```
:::
::::

- Sustituye entero al pie de la librería (también en el panel SEO) y recibe
  [`FooterProps`](#footerprops-el-pie-propio).
- Con analítica, tu pie debe pintar `CookieSettingsButton` cuando `cookieControl` es `true`: es la
  forma de retirar el consentimiento.
- Es el **único** componente que se puede sustituir; la cabecera no, por ahora. Una ruta que no existe
  o que no es `.astro` rompe el build.

## Componentes y props

Además de las páginas de documentación, la librería exporta piezas pequeñas para las páginas que el
sitio escribe en `src/pages/`. Todas salen de la subruta `./components/*`, no llevan datos ni textos
propios (lo que muestran llega por props o por la ranura) y usan los tokens de `theme.css`.

### `BaseLayout`

`@velezanthony/design/components/layouts/BaseLayout.astro` pinta el documento y nada más: `<html>`, el
`<head>`, el tema y el aviso de consentimiento. Lo usan las [páginas propias](#páginas-propias).

:::note[Todas las props de `BaseLayout`]{collapsed}
| Prop | Qué es |
| --- | --- |
| `lang` | Idioma del documento (`<html lang>`). |
| `head` | Las etiquetas del `<head>` como datos: `{ tag: 'title' \| 'meta' \| 'link' \| 'script', attrs, content? }[]`. |
| `bodyClass` | Clases de `<body>`. `BaseLayout` no impone ningún diseño: lo pones tú. |
| `htmlAttrs` | Atributos extra de `<html>`. |
| `gtmId`, `privacyUrl` | Con `gtmId` se pinta el aviso de consentimiento, que exige `privacyUrl`; sin ella, falla con un error que la nombra. |
| `strings` | Opcional. Catálogo de interfaz del aviso; sin él, los textos por defecto en inglés. |
| `label`, `message`, `acceptLabel`, `rejectLabel`, `privacyLabel` | Textos sueltos del aviso para quien tiene su propio i18n: cada uno manda sobre `strings`. |
:::

Ranuras:

| Ranura | Dónde cae |
| --- | --- |
| `head` | Al final de `<head>`: fuentes, hojas, etiquetas propias. |
| (por defecto) | El contenido de `<body>`: tu cabecera, tu `<main>` y tu pie. |
| `scripts` | Al final de `<body>`, tras el arranque de la librería. |

### Atoms

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `CookieSettingsButton` | `@velezanthony/design/components/atoms/actions/CookieSettingsButton.astro` | El botón «Preferencias de cookies» del pie: reabre el aviso de consentimiento (`data-consent-open`). Recibe `strings` y una `class` opcional. Para un pie propio con analítica ([Pie propio](#un-pie-propio-sitecomponentsfooter)). |
| `Icon` | `@velezanthony/design/components/atoms/display/Icon.astro` | Iconos `mail`, `github`, `linkedin`, `external` y `arrow`; `size` (16 por defecto). `github` y `linkedin` van rellenos y el resto de trazo. |
| `InlineList` | `@velezanthony/design/components/atoms/display/InlineList.astro` | Elementos cortos (`items: string[]`) separados por un punto medio que nunca abre ni cierra una línea. |
| `Text` | `@velezanthony/design/components/atoms/display/Text.astro` | Un párrafo con `tone` (`ink`, `muted`, `faint`), `size` (`lead`, `base`, `row`, `sm`), `as` (`p`, `span`, `div`) y `measure` para limitar la línea a la medida de lectura. El contenido va en la ranura. |

### Molecules

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `SectionHead` | `@velezanthony/design/components/molecules/content/SectionHead.astro` | Etiqueta en mayúsculas (`eyebrow`), título opcional (`Heading`, con `level` 2 o 3 y `size` `lg` o `md`) y una acción `{ href, label }` opcional (`Link` en variante `action`). Sin `title`, la acción va en la línea de la etiqueta. |

```astro
<SectionHead eyebrow="Tutoriales" title="Lo último" action={{ href: '/tutoriales/', label: 'Ver todos' }} />
```

### Organisms

#### `Article`: el contenido de una página, con el índice al lado

`Article` es la pieza que `DocsLayout` usa para el contenido de cada página de docs, y se puede usar
tal cual en una página propia que pinte Markdown (un caso de estudio, un artículo). Da el
contenedor con los textos del cliente (copiar código, visor de diagramas, anclas de encabezado,
ampliar imágenes), el `.prose` con el idioma del contenido y, si lo pides, la columna con el índice.
Importación: `@velezanthony/design/components/organisms/content/Article.astro`.

:::note[Todas las props de `Article`]{collapsed}
| Prop | Qué hace |
| --- | --- |
| `strings` | El catálogo de interfaz (`designStrings(locale)` de `@velezanthony/design/site`). Obligatoria. |
| `headings` | Los encabezados que devuelve `render(entry)`. Alimentan el índice. |
| `toc` | `false` no reserva índice aunque haya encabezados. Por defecto, `true`. |
| `depth`, `maxHeight` | Último nivel que lista el índice (2 a 6, por defecto 3) y su altura máxima CSS. |
| `toggles`, `open` | El botón que pliega el índice a un raíl y el estado con el que nace. |
| `as` | `main` (por defecto) o `div`, si la página ya tiene su propio `<main>`. |
| `id`, `class` | Atributos del contenedor; `class` se suma a `min-w-0`. |
| `columnClass` | Clases de la columna lateral. La página decide desde qué ancho se ve (`hidden xl:block`). |
| `contentLang` | Idioma del contenido si difiere del de la página (una ruta de reserva). |
| `prose` | `false` para un contenido con su propio marcado, sin el estilo de `.prose`. |
| `indexable` | Marca el contenido para Pagefind (`true`) o lo excluye (`false`); sin él, no marca nada. |
:::

Ranuras: la por defecto es el contenido; `before` y `after` van dentro del contenedor, antes y
después del `.prose` (el aviso de idioma de reserva y el anterior/siguiente en docs); `aside` va en
la columna lateral, **encima** del índice, para meter ahí una barra propia (estado, descargas, stack).

El contenedor y la columna se emiten como **hermanos**, sin envoltorio: la rejilla es de la página.
La columna solo existe si hay índice (tres o más entradas, y `toc` activo) o contenido en `aside`.
`Article` arranca su propio JavaScript (`bootArticle`), así que no hace falta `bootDocs` ni nada más:
lo propio de docs (barra, búsqueda, año) queda fuera.

```astro
---
import Article from '@velezanthony/design/components/organisms/content/Article.astro';
import { designStrings } from '@velezanthony/design/site';
import { render } from 'astro:content';

const { Content, headings } = await render(entry);
---

<div class="grid gap-x-16 md:grid-cols-[minmax(0,1fr)_16rem]">
  <Article as="div" strings={designStrings('es')} headings={headings} depth={2} columnClass="space-y-8">
    <Content />
    <aside slot="aside">Estado, descargas, stack…</aside>
  </Article>
</div>
```

### Scripts, `<head>` y textos para quien tiene su propio layout

Un sitio con su propio layout no tiene que reimplementar lo que la librería ya hace. Estas subrutas
son estrechas y explícitas; ninguna arrastra el panel de dev (`seo-on-page`), y un test lo comprueba.

:::note[Todas las subrutas]{collapsed}
| Importación | Qué da |
| --- | --- |
| `@velezanthony/design/theme.css` | La hoja de la librería (Tailwind, tokens y estilos). `BaseLayout` ya la carga: impórtala solo si montas un `<html>` sin él. |
| `@velezanthony/design/site-theme` | El CSS vacío que `theme.css` importa en último lugar; la integración lo apunta al archivo de la opción `theme` ([CSS propio](#css-propio-sitetheme)). No se importa a mano. |
| `@velezanthony/design/theme-colors` | `themeColors`: el `--color-canvas` de cada tema, para `<meta name="theme-color">` y `themeBootstrapScript`. |
| `@velezanthony/design/client/theme` | Tema claro/oscuro: `initTheme`, `themeBootstrapScript` (el script previo al pintado) y los tipos `Theme` y `ThemeColors`. |
| `@velezanthony/design/client/consent` | Consentimiento: `initConsent`, `readConsent`, `writeConsent` y `CONSENT_VERSION`. |
| `@velezanthony/design/client/storage` | Claves y acceso seguro al almacenamiento: `THEME_KEY`, `CONSENT_KEY`, `safeGet`, `safeSet`, `storageOf`. |
| `@velezanthony/design/client/toc` | `trackSections`: resalta en el índice la sección visible. |
| `@velezanthony/design/head` | `buildHead` y el tipo `HeadConfig` (una etiqueta del `<head>` como dato: lo que acepta la prop `head` de `BaseLayout`). |
| `@velezanthony/design/ui-strings` | El tipo `UiStrings`, `defaultStrings`, `englishStrings`, `mergeUiStrings` y `translate`. |
| `@velezanthony/design/site` | `designStrings(locale)`: los textos de interfaz ya fusionados con los del sitio, `gtmId`: el ID resuelto desde `PUBLIC_GTM_ID` o la config, y `privacyUrl(locale)`: la URL de privacidad de ese idioma, resuelta desde la config. Evita importar `virtual:` desde el sitio. |
| `@velezanthony/design/last-modified` | `fileLastModified(file, root?)`: fecha ISO de la última modificación de un archivo (su último commit o, sin él, la del archivo; nada en un clon superficial), la misma que el `<lastmod>` del sitemap. Asíncrona; sirve para el `dateModified` de un JSON-LD. |
| `@velezanthony/design/seo` | `pageHead(…)`: el `<head>` de una página del sitio con la config de la librería (ver [El `<head>` de una página propia](#el-head-de-una-página-propia)). |
| `@velezanthony/design/seo-schema` | `seoSchema`: el bloque `seo` del frontmatter como fragmento zod, y el tipo `PageSeo`. |
| `@velezanthony/design/fonts` | `<Fonts />`: las fuentes que registra `docs()` (IBM Plex Sans con `preload` y Plex Mono), para el `<head>` de un layout propio: `<Fonts slot="head" />` dentro de `BaseLayout`. Necesita la integración `docs()`: sin ella no hay fuentes que pintar. |
| `@velezanthony/design/code-themes` | `codeThemes`: los temas de Shiki que usa la librería, para que el sitio resalte igual. |
:::

`bootBase` y `bootDocs` salen de `@velezanthony/design/components/layouts/boot.ts`; `bootArticle`, de `@velezanthony/design/components/boot/article.ts` (un organismo no importa del nivel de los layouts, así que vive aparte).

### El `<head>` de una página propia

Una página del sitio (la portada, un caso de estudio, la 404) necesita el mismo `<head>` que una de
docs: título con sufijo, descripción, `canonical`, `hreflang`, Open Graph, Twitter y JSON-LD.
`pageHead` lo calcula con la config del sitio (sufijo del título, imagen social por defecto, JSON-LD
del sitio, favicon, `site.seo.ogLocales`) y devuelve exactamente lo que acepta la prop `head` de `BaseLayout`:
el sitio no interpreta nada.

```astro
---
import LibraryBaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import { pageHead } from '@velezanthony/design/seo';

const head = await pageHead({
  title: 'Guía de instalación',              // lo que lleva el <title> (y og:title, con sufijo)
  seo: entry.data.seo,                       // el bloque del frontmatter, o valores sueltos
  locale: 'es',
  url: Astro.url.pathname,                   // con la base, como la sirve Astro
  alternates: { es: '/guia/instalacion/', en: '/en/guide/installation/' },
  schema: [techArticle, breadcrumb],         // JSON-LD propio de la página
});
---

<LibraryBaseLayout lang="es" head={head}>…</LibraryBaseLayout>
```

| Campo | Qué hace |
| --- | --- |
| `title` | El título de la página. `seo.title` lo cambia solo para el `<head>`. |
| `seo` | El bloque `seo` del frontmatter (`title`, `titleSuffix`, `description`, `image`, `noindex`, `schema`) o los valores sueltos de una página que no es Markdown: `{ description: '…' }`. Manda sobre la config del sitio campo a campo. |
| `locale` | Idioma de la página: `og:locale` y la cascada de textos por idioma. |
| `url` | Ruta de la página con la base: de ella salen `canonical` y `og:url`. |
| `alternates` | La misma página en cada idioma (ruta con base): de ahí salen los `hreflang` (con `x-default` del idioma por defecto) y `og:locale:alternate`. Sin ella, ninguno. |
| `ogType` | `og:type`: `article` por defecto; `website` para una portada. |
| `schema` | JSON-LD propio de la página: va tras el del sitio y el de `seo.schema`, y no lo quita `seo.schema: false` (ese `false` es del frontmatter, esto lo pone el código). |

Una página con `seo.noindex` lleva `robots: noindex` y **ni `canonical` ni `hreflang`**: no se nombra a
sí misma. Las imágenes de `seo.image` y la de la config se leen de `public/` para dar `og:image:width`
y `og:image:height`.

Para que una colección propia admita el mismo bloque en su frontmatter, añade el fragmento a su
esquema:

```ts
import { seoSchema } from '@velezanthony/design/seo-schema';

const projects = defineCollection({
  loader,
  schema: z.object({ name: z.string(), seo: seoSchema.optional() }),
});
```

`og:locale` lleva el idioma tal cual (`es`) salvo que la config diga el territorio con
`ogLocales: { es: 'es_ES', en: 'en_GB' }`, que es lo que Open Graph espera.

### Textos de `ThemeToggle` y `ConsentBanner` por props

Los dos reciben `strings` (el catálogo de interfaz), que es **opcional**: sin él se usan los textos
por defecto en inglés. Un sitio con su propio i18n puede ignorar el catálogo y pasar los textos
sueltos; cada prop manda sobre `strings`, y lo que no se pase sale de él.

| Componente | Props de texto |
| --- | --- |
| `ThemeToggle` | `label`: el nombre accesible del botón. |
| `ConsentBanner` | `label` (nombre de la región), `message`, `acceptLabel`, `rejectLabel` y `privacyLabel` (el enlace a la privacidad). |

### `FooterProps`: el pie propio

Un pie propio ([`site.components.Footer`](#un-pie-propio-sitecomponentsfooter))
recibe estas props (`import type { FooterProps } from '@velezanthony/design/integration'`):

| Prop | Tipo | Qué es |
| --- | --- | --- |
| `lang` | `string` | Idioma de la página. |
| `siteName` | `string` | El `site.name` de la config. |
| `year` | `number` | Año del build, para el copyright. |
| `strings` | `UiStrings` | Textos de interfaz del idioma, ya fusionados con los de `i18n.ui`. |
| `privacyUrl` | `string \| undefined` | La `privacyUrl` del idioma; sin ella, no hay enlace que pintar. |
| `cookieControl` | `boolean` | `true` con analítica: hay una elección de cookies que reabrir. |
| `footer` | `FooterView \| undefined` | Licencia, autor y enlaces de `site.footer`, ya resueltos al idioma. |

`CookieSettingsButton` (arriba, en Atoms) es el botón «Preferencias de cookies» del pie de la librería:
lleva el atributo `data-consent-open`, que escucha el script de consentimiento.

## Siguiente paso

Todas las opciones de la config, para consultar: [Todas las opciones](./opciones.md).
