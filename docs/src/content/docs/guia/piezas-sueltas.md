---
order: 10
seo:
  title: "Piezas sueltas: iconos, listas, textos y cabeceras de sección"
  description: "Componentes de la librería pensados para páginas propias de un sitio: Icon, InlineList, Text, SectionHead y Article, con sus props y su ruta de importación."
---

# Piezas sueltas para páginas propias

Además de las páginas de documentación, la librería exporta piezas pequeñas para las páginas que el
sitio escribe en `src/pages/`. Todas salen de la subruta `./components/*`, no llevan datos ni textos
propios (lo que muestran llega por props o por la ranura) y usan los tokens de `theme.css`.

## Atoms

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `Icon` | `@velezanthony/design/components/atoms/display/Icon.astro` | Iconos `mail`, `github`, `linkedin`, `external` y `arrow`; `size` (16 por defecto). `github` y `linkedin` van rellenos y el resto de trazo. |
| `InlineList` | `@velezanthony/design/components/atoms/display/InlineList.astro` | Elementos cortos (`items: string[]`) separados por un punto medio que nunca abre ni cierra una línea. |
| `Text` | `@velezanthony/design/components/atoms/display/Text.astro` | Un párrafo con `tone` (`ink`, `muted`, `faint`), `size` (`lead`, `base`, `row`, `sm`), `as` (`p`, `span`, `div`) y `measure` para limitar la línea a la medida de lectura. El contenido va en la ranura. |

`InlineList` coge el ancho del separador de `--separator` (1em por defecto; con tipografía mono,
`3ch`):

```astro
<InlineList items={['Astro', 'TypeScript', 'VS Code API']} class="[--separator:3ch] font-mono" />
```

## Molecules

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `SectionHead` | `@velezanthony/design/components/molecules/content/SectionHead.astro` | Etiqueta en mayúsculas (`eyebrow`), título opcional (`Heading`, con `level` 2 o 3 y `size` `lg` o `md`) y una acción `{ href, label }` opcional (`Link` en variante `action`). Sin `title`, la acción va en la línea de la etiqueta. |

```astro
<SectionHead eyebrow="Proyectos" title="Lo último" action={{ href: '/proyectos/', label: 'Ver todos' }} />
```

## Organisms

### `Article`: el contenido de una página, con el índice al lado

`Article` es la pieza que `DocsLayout` usa para el contenido de cada página de docs, y se puede usar
tal cual en una página propia que pinte Markdown (un caso de estudio, un artículo). Da el
contenedor con los textos del cliente (copiar código, visor de diagramas, anclas de encabezado,
ampliar imágenes), el `.prose` con el idioma del contenido y, si lo pides, la columna con el índice.
Importación: `@velezanthony/design/components/organisms/content/Article.astro`.

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

## Scripts, `<head>` y textos para quien tiene su propio layout

Un sitio con su propio layout no tiene que reimplementar lo que la librería ya hace. Estas subrutas
son estrechas y explícitas; ninguna arrastra el panel de dev (`seo-on-page`), y un test lo comprueba.

| Importación | Qué da |
| --- | --- |
| `@velezanthony/design/theme.css` | La hoja de la librería (Tailwind, tokens y estilos). `BaseLayout` ya la carga: impórtala solo si montas un `<html>` sin él. |
| `@velezanthony/design/site-theme` | El CSS vacío que `theme.css` importa en último lugar; la integración lo apunta al archivo de la opción `theme` ([CSS propio](./primeros-pasos.md#css-propio-del-sitio-theme)). No se importa a mano. |
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

`bootBase` y `bootDocs` salen de `@velezanthony/design/components/layouts/boot.ts`; `bootArticle`, de `@velezanthony/design/components/boot/article.ts` (un organismo no importa del nivel de los layouts, así que vive aparte).

## El `<head>` de una página propia

Una página del sitio (la portada, un caso de estudio, la 404) necesita el mismo `<head>` que una de
docs: título con sufijo, descripción, `canonical`, `hreflang`, Open Graph, Twitter y JSON-LD.
`pageHead` lo calcula con la config del sitio (sufijo del título, imagen social por defecto, JSON-LD
del sitio, favicon, `ogLocales`) y devuelve exactamente lo que acepta la prop `head` de `BaseLayout`:
el sitio no interpreta nada.

```astro
---
import LibraryBaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import { pageHead } from '@velezanthony/design/seo';

const head = await pageHead({
  title: 'SnakeORM · ORM en Python tipado',   // lo que lleva el <title> (y og:title, con sufijo)
  seo: entry.data.seo,                       // el bloque del frontmatter, o valores sueltos
  locale: 'es',
  url: Astro.url.pathname,                   // con la base, como la sirve Astro
  alternates: { es: '/proyectos/snake-orm/', en: '/en/projects/snake-orm/' },
  schema: [softwareSourceCode, breadcrumb],  // JSON-LD propio de la página
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

## Textos de `ThemeToggle` y `ConsentBanner` por props

Los dos reciben `strings` (el catálogo de interfaz) y ahora es **opcional**: sin él se usan los textos
por defecto en inglés. Un sitio con su propio i18n puede ignorar el catálogo y pasar los textos
sueltos; cada prop manda sobre `strings`, y lo que no se pase sale de él.

| Componente | Props de texto |
| --- | --- |
| `ThemeToggle` | `label`: el nombre accesible del botón. |
| `ConsentBanner` | `label` (nombre de la región), `message`, `acceptLabel`, `rejectLabel` y `privacyLabel` (el enlace a la privacidad). |

```astro
<ThemeToggle label={t('Cambiar tema')} />
<ConsentBanner gtmId={gtmId} privacyUrl="/privacidad/" message={t('Usamos cookies…')} acceptLabel={t('Aceptar')} />
```
