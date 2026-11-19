---
order: 9
seo:
  title: "Un sitio con su propia cabecera y pie: BaseLayout"
  description: "Los dos niveles de layout de la librería y cómo montar una página con tu cabecera y tu pie sobre BaseLayout, con contenido extra en el head y scripts propios por las ranuras."
---

# Cabecera y pie propios con `BaseLayout`

Los layouts son dos, por composición, no por herencia:

```mermaid
flowchart TD
  base["BaseLayout<br/>html · head · tema · theme.css · consentimiento"]
  docs["DocsLayout<br/>cabecera · barra lateral · contenido · índice · pie"]
  own["Tu layout<br/>tu cabecera · tu pie"]
  docs -->|usa| base
  own -->|usa| base
```

- `BaseLayout` pinta el documento y **nada más**: `<html>`, el `<head>` (etiquetas SEO, `theme.css`,
  tema claro/oscuro, `theme-color`) y el aviso de consentimiento. No pone cabecera, pie ni diseño en
  el `<body>`.
- `DocsLayout` es el layout de las páginas de documentación, construido sobre `BaseLayout`. Es lo que
  usa la integración; no hace falta tocarlo para tener un sitio de docs.

Úsalo cuando una página del sitio (la portada, un currículum, una página legal) necesita el tema y el
consentimiento de la librería pero no la barra lateral de la documentación. Es el caso de una página
de `src/pages/`.

## Importarlo

Sale de la subruta `./components/*` del paquete, igual que cualquier componente:

```astro
---
import BaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
---
```

## Props

| Prop | Qué es |
| --- | --- |
| `lang` | Idioma del documento (`<html lang>`). |
| `head` | Las etiquetas del `<head>` como datos: `{ tag: 'title' \| 'meta' \| 'link' \| 'script', attrs, content? }[]`. |
| `bodyClass` | Clases de `<body>`. `BaseLayout` no impone ningún diseño: lo pones tú. |
| `htmlAttrs` | Atributos extra de `<html>`. |
| `gtmId`, `privacyUrl` | Con `gtmId` se pinta el aviso de consentimiento, que exige `privacyUrl`; sin ella, falla con un error que la nombra. |
| `strings` | Opcional. Catálogo de interfaz del aviso; sin él, los textos por defecto en inglés. |
| `label`, `message`, `acceptLabel`, `rejectLabel`, `privacyLabel` | Textos sueltos del aviso para quien tiene su propio i18n: cada uno manda sobre `strings`. |

## Ranuras

| Ranura | Dónde cae |
| --- | --- |
| `head` | Al final de `<head>`: fuentes, hojas, etiquetas propias. |
| (por defecto) | El contenido de `<body>`: tu cabecera, tu `<main>` y tu pie. |
| `scripts` | Al final de `<body>`, tras el arranque de la librería. |

## Una página con cabecera y pie propios

```astro
---
import BaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import ThemeToggle from '@velezanthony/design/components/molecules/controls/ThemeToggle.astro';
import Fonts from '@velezanthony/design/fonts';
import { pageHead } from '@velezanthony/design/seo';
import { designStrings } from '@velezanthony/design/site';

/* Los textos de interfaz ya fusionados con los tuyos, por idioma. */
const strings = designStrings('es');
const head = await pageHead({
  title: 'Currículum',
  seo: { description: 'Mi currículum.' },
  locale: 'es',
  url: Astro.url.pathname,
});
---

<BaseLayout lang="es" head={head} bodyClass="flex min-h-dvh flex-col">
  <Fonts slot="head" />
  <link slot="head" rel="preload" href="/cv.pdf" as="document" />

  <header class="flex items-center justify-between px-6 py-4">
    <a href="/">Ana</a>
    <ThemeToggle strings={strings} />
  </header>
  <main id="main-content" class="mx-auto w-full max-w-3xl flex-1 px-6">
    <h1>Currículum</h1>
  </main>
  <footer class="px-6 py-4 text-sm text-muted">© 2026 Ana</footer>

  <script slot="scripts" src="/analytics-extra.js" is:inline></script>
</BaseLayout>
```

- **El `<head>`.** `pageHead` (`@velezanthony/design/seo`) calcula título con sufijo, descripción,
  `canonical`, `hreflang`, Open Graph y JSON-LD con la config del sitio. Es asíncrona y devuelve lo que
  acepta la prop `head`. Sus campos, en [El `<head>` de una página propia](./piezas-sueltas.md#el-head-de-una-página-propia).
  Si prefieres no usarla, `head` admite etiquetas a mano: `{ tag: 'title', attrs: {}, content: '…' }`.
- **Fuentes.** `<Fonts slot="head" />` pinta las de la librería (Plex Sans y Plex Mono). Necesita la
  integración `docs()`: sin ella no hay fuentes registradas.
- **Contenido extra en el `head`.** Todo lo que lleve `slot="head"` va al final de `<head>`, después de
  lo que pone la librería: fuentes, una hoja más, una etiqueta propia. Los elementos de la ranura se
  pueden agrupar con `<Fragment slot="head">`.
- **Scripts propios.** Todo lo que lleve `slot="scripts"` va al final de `<body>`. La librería ya ha
  cableado el tema y el consentimiento antes (`bootBase`), así que el `ThemeToggle` funciona sin más.
- **Tu diseño.** `bodyClass` es lo único que `BaseLayout` te deja decir sobre el `<body>`; el resto de
  clases y el orden de los bloques son tuyos.
- **Markdown con índice.** Para pintar contenido Markdown con su índice «En esta página» dentro de tu
  diseño, usa `Article` ([Piezas sueltas](./piezas-sueltas.md#article-el-contenido-de-una-página-con-el-índice-al-lado)).

Los textos (`designStrings(locale)`) salen de `@velezanthony/design/site` y ya llevan fusionadas tus
sobrescrituras de `ui`. Esa subruta evita importar `virtual:@velezanthony/design/config` desde el sitio.

> [!NOTE]
> Con analítica, `BaseLayout` necesita `gtmId` y `privacyUrl`. `@velezanthony/design/site` da las dos ya
> resueltas: `gtmId` y `privacyUrl(locale)`, la URL del idioma de la página, leída de la config.

## Lo que ya viene resuelto

- El tema claro/oscuro: el script previo al pintado y el arranque de cliente (`bootBase`).
- El aviso de consentimiento, con `gtmId` y `privacyUrl` (los textos, con `strings` o sueltos). Si quieres además el botón
  «Preferencias de cookies» en tu pie, usa `DocsFooter` con `cookieControl`, o el tuyo con el
  atributo `data-consent-open`.
- `theme.css`: la paleta, los tokens y los estilos base, sin que el consumidor importe CSS.

## Si quieres la disposición de las páginas de docs

No hace falta rehacerla: `DocsLayout` reexpone las ranuras `head` y `scripts` de `BaseLayout` (y
`DocPage` también), así que el contenido extra se añade igual:

```astro
<DocsLayout {...view}>
  <Font slot="head" cssVariable="--font-plex-sans" preload />
  <script slot="scripts" src="/extra.js" is:inline></script>
  <Content />
</DocsLayout>
```
