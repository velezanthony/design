---
slug: guide/customise
seo:
  title: "Customise the theme, layout, pages and footer"
  description: "Adjust the layout, theme, your own CSS tokens and favicon, build pages with your own header and footer on BaseLayout, and use the components the library exports."
---

# Customise

By the end of this page you will know how to adjust the look of the site, build pages with your own
header and footer, and use the pieces the library exports.

## Look and feel

### Layout (`site.layout`)

```js
import { LayoutWidth, PanelState } from '@velezanthony/design/integration';

site: {
  layout: {
    sidebar: PanelState.OPEN, // or COLLAPSED: initial state of the navigation (from lg)
    toc: PanelState.OPEN, // the same for "On this page" (from xl)
    width: LayoutWidth.READING, // or FULL
    toggles: true, // false removes the controls and ignores what the visitor saved
    tocDepth: 3, // last level of "On this page", from 2 to 6
    tocMaxHeight: '60vh', // optional: past that height, the table of contents scrolls inside
  },
},
```

- **`READING`** (default) centres the page; **`FULL`** pins the sidebar to the edge and lets the
  content fill the rest.
- Each side column **collapses** into a narrow rail. With a side collapsed or in `FULL`, code, tables
  and screenshots take the whole column.
- The visitor's choice is saved and applied before painting, so there is no jump on reload.
- Below `lg`, the navigation sits behind the "Menu" button.

### Your own CSS (`site.theme`)

The library owns Tailwind: you do not write your own `@import 'tailwindcss'`. Put your tokens and
styles in a CSS file and declare it:

::::tabs
:::tab[docs.config.mjs]
```js
site: { theme: 'src/styles/site.css' }, // from the project root; the file must exist
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

- It is compiled in the same pass as the library theme, last: `@theme` generates utilities
  (`text-aviso`) and you can override what came before. Tailwind detects the classes in your files on
  its own.
- Do not import `theme.css` yourself: the library already loads it.
- The tokens you can use or override are in [Palette and tokens](../por-dentro/paleta.md).

### The tab icon (`site.favicon`)

```js
site: { favicon: 'favicon.svg' }, // a file in public/, or an https URL
```

Without it, the package's icon is used. A `public/` file that does not exist breaks the build. The
favicons the Astro scaffold brings are not used unless you point at them.

:::note[Theme, transitions, zoom and printing]{collapsed}
- **Light/dark theme:** with no choice, the system decides; the header switch saves the visitor's
  choice in `localStorage` (`theme`).
- **Transitions:** when navigating, the header and the bars stay still and the content fades in; a
  theme change is revealed with a circle. With reduced motion there are none.
- **Zoom:** images with `alt` zoom in when clicked, except decorative ones, linked ones, those under
  96px and those with `data-no-zoom`.
- **Printing:** the "back to top" button and the cookie notice are hidden.
:::

## Your own pages

### A page on `BaseLayout`

`BaseLayout` renders the document and **nothing else**: `<html>`, the `<head>`, the light/dark theme and
the consent notice. The header, the footer and the `<body>` layout are yours. (Docs pages use
`DocsLayout`, built on top of it.)

```astro
---
// src/pages/cv.astro
import BaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import ThemeToggle from '@velezanthony/design/components/molecules/controls/ThemeToggle.astro';
import Fonts from '@velezanthony/design/fonts';
import { pageHead } from '@velezanthony/design/seo';
import { designStrings } from '@velezanthony/design/site';

const strings = designStrings('en'); // interface texts, already with your overrides
const head = await pageHead({
  title: 'CV',
  seo: { description: 'My CV.' },
  locale: 'en',
  url: Astro.url.pathname,
});
---

<BaseLayout lang="en" head={head} bodyClass="flex min-h-dvh flex-col">
  <Fonts slot="head" />
  <header class="flex items-center justify-between px-6 py-4">
    <a href="/">Ana</a>
    <ThemeToggle strings={strings} />
  </header>
  <main id="main-content" class="mx-auto w-full max-w-3xl flex-1 px-6">
    <h1>CV</h1>
  </main>
  <footer class="px-6 py-4 text-sm text-muted">© 2026 Ana</footer>
  <script slot="scripts" src="/extra.js" is:inline></script>
</BaseLayout>
```

- **`pageHead`** builds the `<head>` from the site config: title with suffix, description, canonical,
  `hreflang`, Open Graph and JSON-LD.
- **Slots:** whatever has `slot="head"` goes at the end of the `<head>`; `slot="scripts"`, at the end
  of the `<body>`, once the theme and consent are wired up.
- **With analytics,** pass `gtmId` and `privacyUrl`, which `@velezanthony/design/site` gives you
  already resolved (`gtmId` and `privacyUrl(locale)`).
- **Markdown with a table of contents:** to render Markdown content with "On this page" inside your
  own layout, use `Article`.

The props of `BaseLayout`, `Article`, `pageHead` and the other pieces are in
[Components and props](#components-and-props).

### The footer of docs pages (`site.footer`)

```js
site: {
  footer: {
    license: { label: 'MIT', href: 'https://github.com/o/r/blob/main/LICENSE' }, // or just 'MIT'
    author: { name: 'Ana', href: 'https://ana.dev' }, // false hides it
    links: [
      { label: 'Changes', slug: 'changelog' }, // a page
      { label: 'Blog', href: 'https://blog.dev' }, // external, https only
    ],
  },
},
```

- The first row shows `© <year> <name> by <author>`, your `links`, and the repository and "Report a
  bug" if you set `site.social.github`. The second, the licence, privacy and, with analytics, the
  "Cookie preferences" button.
- Without `author`, the library's maintainer signs. Only what exists is rendered.
- The build breaks on a `slug` that is not a page, a link with both `slug` and `href` (or neither) and
  an `href` that is not `https://`.

### Your own footer (`site.components.Footer`)

If you already have a footer, use it on the docs pages too:

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

- It fully replaces the library's footer (also in the SEO panel) and receives
  [`FooterProps`](#footerprops-your-own-footer).
- With analytics, your footer must render `CookieSettingsButton` when `cookieControl` is `true`: it is
  how consent is withdrawn.
- It is the **only** component that can be replaced; the header cannot, for now. A path that does not
  exist or is not `.astro` breaks the build.

## Components and props

Besides the documentation pages, the library exports small pieces for the pages your site writes in
`src/pages/`. They all come from the `./components/*` subpath, carry no data or texts of their own
(what they show comes through props or the slot) and use the `theme.css` tokens.

### `BaseLayout`

`@velezanthony/design/components/layouts/BaseLayout.astro` renders the document and nothing else:
`<html>`, the `<head>`, the theme and the consent notice. [Your own pages](#your-own-pages) use it.

:::note[All `BaseLayout` props]{collapsed}
| Prop | What it is |
| --- | --- |
| `lang` | Document language (`<html lang>`). |
| `head` | The `<head>` tags as data: `{ tag: 'title' \| 'meta' \| 'link' \| 'script', attrs, content? }[]`. |
| `bodyClass` | `<body>` classes. `BaseLayout` imposes no layout: you set it. |
| `htmlAttrs` | Extra `<html>` attributes. |
| `gtmId`, `privacyUrl` | With `gtmId` the consent notice is rendered, which requires `privacyUrl`; without it, it fails with an error naming it. |
| `strings` | Optional. Interface catalogue for the notice; without it, the default English texts. |
| `label`, `message`, `acceptLabel`, `rejectLabel`, `privacyLabel` | Individual notice texts for sites with their own i18n: each one wins over `strings`. |
:::

Slots:

| Slot | Where it goes |
| --- | --- |
| `head` | At the end of `<head>`: fonts, stylesheets, your own tags. |
| (default) | The `<body>` content: your header, your `<main>` and your footer. |
| `scripts` | At the end of `<body>`, after the library boots. |

### Atoms

| Piece | Import | What it does |
| --- | --- | --- |
| `CookieSettingsButton` | `@velezanthony/design/components/atoms/actions/CookieSettingsButton.astro` | The footer's "Cookie preferences" button: reopens the consent notice (`data-consent-open`). Takes `strings` and an optional `class`. For your own footer with analytics ([Your own footer](#your-own-footer-sitecomponentsfooter)). |
| `Icon` | `@velezanthony/design/components/atoms/display/Icon.astro` | Icons `mail`, `github`, `linkedin`, `external` and `arrow`; `size` (16 by default). `github` and `linkedin` are filled and the rest are strokes. |
| `InlineList` | `@velezanthony/design/components/atoms/display/InlineList.astro` | Short items (`items: string[]`) separated by a middle dot that never starts or ends a line. |
| `Text` | `@velezanthony/design/components/atoms/display/Text.astro` | A paragraph with `tone` (`ink`, `muted`, `faint`), `size` (`lead`, `base`, `row`, `sm`), `as` (`p`, `span`, `div`) and `measure` to limit the line to the reading measure. The content goes in the slot. |

### Molecules

| Piece | Import | What it does |
| --- | --- | --- |
| `SectionHead` | `@velezanthony/design/components/molecules/content/SectionHead.astro` | An uppercase label (`eyebrow`), an optional title (`Heading`, with `level` 2 or 3 and `size` `lg` or `md`) and an optional action `{ href, label }` (`Link` in its `action` variant). Without `title`, the action sits on the label's line. |

```astro
<SectionHead eyebrow="Tutorials" title="Latest" action={{ href: '/tutorials/', label: 'See all' }} />
```

### Organisms

#### `Article`: a page's content, with the table of contents beside it

`Article` is the piece `DocsLayout` uses for the content of each docs page, and you can use it as is
in a page of your own that renders Markdown (a case study, an article). It provides the container with
the client texts (copy code, diagram viewer, heading anchors, image zoom), the `.prose` with the
content language and, if you ask for it, the column with the table of contents.
Import: `@velezanthony/design/components/organisms/content/Article.astro`.

:::note[All `Article` props]{collapsed}
| Prop | What it does |
| --- | --- |
| `strings` | The interface catalogue (`designStrings(locale)` from `@velezanthony/design/site`). Required. |
| `headings` | The headings returned by `render(entry)`. They feed the table of contents. |
| `toc` | `false` reserves no table of contents even if there are headings. Defaults to `true`. |
| `depth`, `maxHeight` | Last level the table of contents lists (2 to 6, default 3) and its maximum CSS height. |
| `toggles`, `open` | The button that collapses the table of contents into a rail, and its initial state. |
| `as` | `main` (default) or `div`, if the page already has its own `<main>`. |
| `id`, `class` | Container attributes; `class` is added to `min-w-0`. |
| `columnClass` | Classes of the side column. The page decides from which width it shows (`hidden xl:block`). |
| `contentLang` | Content language if it differs from the page's (a fallback route). |
| `prose` | `false` for content with its own markup, without the `.prose` style. |
| `indexable` | Marks the content for Pagefind (`true`) or excludes it (`false`); without it, marks nothing. |
:::

Slots: the default one is the content; `before` and `after` go inside the container, before and after
the `.prose` (the fallback language notice and previous/next in docs); `aside` goes in the side column,
**above** the table of contents, for a bar of your own (status, downloads, stack).

The container and the column are emitted as **siblings**, with no wrapper: the grid belongs to the
page. The column only exists if there is a table of contents (three or more entries, and `toc` on) or
content in `aside`. `Article` boots its own JavaScript (`bootArticle`), so you need neither `bootDocs`
nor anything else: docs-only behaviour (sidebar, search, year) stays out.

```astro
---
import Article from '@velezanthony/design/components/organisms/content/Article.astro';
import { designStrings } from '@velezanthony/design/site';
import { render } from 'astro:content';

const { Content, headings } = await render(entry);
---

<div class="grid gap-x-16 md:grid-cols-[minmax(0,1fr)_16rem]">
  <Article as="div" strings={designStrings('en')} headings={headings} depth={2} columnClass="space-y-8">
    <Content />
    <aside slot="aside">Status, downloads, stack…</aside>
  </Article>
</div>
```

### Scripts, `<head>` and texts for sites with their own layout

A site with its own layout does not have to reimplement what the library already does. These subpaths
are narrow and explicit; none of them pulls in the dev panel (`seo-on-page`), and a test checks it.

:::note[All subpaths]{collapsed}
| Import | What it gives |
| --- | --- |
| `@velezanthony/design/theme.css` | The library stylesheet (Tailwind, tokens and styles). `BaseLayout` already loads it: import it only if you build an `<html>` without it. |
| `@velezanthony/design/site-theme` | The empty CSS that `theme.css` imports last; the integration points it at the file in the `theme` option ([Your own CSS](#your-own-css-sitetheme)). Not imported by hand. |
| `@velezanthony/design/theme-colors` | `themeColors`: each theme's `--color-canvas`, for `<meta name="theme-color">` and `themeBootstrapScript`. |
| `@velezanthony/design/client/theme` | Light/dark theme: `initTheme`, `themeBootstrapScript` (the pre-paint script) and the `Theme` and `ThemeColors` types. |
| `@velezanthony/design/client/consent` | Consent: `initConsent`, `readConsent`, `writeConsent` and `CONSENT_VERSION`. |
| `@velezanthony/design/client/storage` | Storage keys and safe access: `THEME_KEY`, `CONSENT_KEY`, `safeGet`, `safeSet`, `storageOf`. |
| `@velezanthony/design/client/toc` | `trackSections`: highlights the visible section in the table of contents. |
| `@velezanthony/design/head` | `buildHead` and the `HeadConfig` type (a `<head>` tag as data: what the `head` prop of `BaseLayout` accepts). |
| `@velezanthony/design/ui-strings` | The `UiStrings` type, `defaultStrings`, `englishStrings`, `mergeUiStrings` and `translate`. |
| `@velezanthony/design/site` | `designStrings(locale)`: interface texts already merged with the site's, `gtmId`: the id resolved from `PUBLIC_GTM_ID` or the config, and `privacyUrl(locale)`: that language's privacy URL, resolved from the config. Avoids importing `virtual:` from the site. |
| `@velezanthony/design/last-modified` | `fileLastModified(file, root?)`: ISO date of a file's last change (its last commit or, without one, the file's; nothing in a shallow clone), the same as the sitemap's `<lastmod>`. Async; useful for a JSON-LD `dateModified`. |
| `@velezanthony/design/seo` | `pageHead(…)`: the `<head>` of a site page with the library config (see [The `<head>` of your own page](#the-head-of-your-own-page)). |
| `@velezanthony/design/seo-schema` | `seoSchema`: the frontmatter `seo` block as a zod fragment, and the `PageSeo` type. |
| `@velezanthony/design/fonts` | `<Fonts />`: the fonts `docs()` registers (IBM Plex Sans with `preload` and Plex Mono), for the `<head>` of your own layout: `<Fonts slot="head" />` inside `BaseLayout`. Needs the `docs()` integration: without it there are no fonts to render. |
| `@velezanthony/design/code-themes` | `codeThemes`: the Shiki themes the library uses, so your site highlights the same way. |
:::

`bootBase` and `bootDocs` come from `@velezanthony/design/components/layouts/boot.ts`; `bootArticle`,
from `@velezanthony/design/components/boot/article.ts` (an organism does not import from the layouts
level, so it lives apart).

### The `<head>` of your own page

A site page (the home page, a case study, the 404) needs the same `<head>` as a docs page: title with
suffix, description, `canonical`, `hreflang`, Open Graph, Twitter and JSON-LD. `pageHead` computes it
from the site config (title suffix, default social image, site JSON-LD, favicon,
`site.seo.ogLocales`) and returns exactly what the `head` prop of `BaseLayout` accepts: the site
interprets nothing.

```astro
---
import LibraryBaseLayout from '@velezanthony/design/components/layouts/BaseLayout.astro';
import { pageHead } from '@velezanthony/design/seo';

const head = await pageHead({
  title: 'Installation guide',               // what the <title> shows (and og:title, with suffix)
  seo: entry.data.seo,                       // the frontmatter block, or individual values
  locale: 'en',
  url: Astro.url.pathname,                   // with the base, as Astro serves it
  alternates: { en: '/guide/installation/', es: '/es/guia/instalacion/' },
  schema: [techArticle, breadcrumb],         // the page's own JSON-LD
});
---

<LibraryBaseLayout lang="en" head={head}>…</LibraryBaseLayout>
```

| Field | What it does |
| --- | --- |
| `title` | The page title. `seo.title` changes it for the `<head>` only. |
| `seo` | The frontmatter `seo` block (`title`, `titleSuffix`, `description`, `image`, `noindex`, `schema`) or the individual values of a page that is not Markdown: `{ description: '…' }`. It wins over the site config field by field. |
| `locale` | Page language: `og:locale` and the per-language text cascade. |
| `url` | Page path with the base: `canonical` and `og:url` come from it. |
| `alternates` | The same page in each language (path with base): the `hreflang` (with `x-default` for the default language) and `og:locale:alternate` come from it. Without it, none. |
| `ogType` | `og:type`: `article` by default; `website` for a home page. |
| `schema` | The page's own JSON-LD: it goes after the site's and `seo.schema`, and `seo.schema: false` does not remove it (that `false` belongs to the frontmatter; this is set by the code). |

A page with `seo.noindex` gets `robots: noindex` and **neither `canonical` nor `hreflang`**: it does
not name itself. The images in `seo.image` and the config's are read from `public/` to give
`og:image:width` and `og:image:height`.

For a collection of your own to accept the same block in its frontmatter, add the fragment to its
schema:

```ts
import { seoSchema } from '@velezanthony/design/seo-schema';

const projects = defineCollection({
  loader,
  schema: z.object({ name: z.string(), seo: seoSchema.optional() }),
});
```

`og:locale` carries the language as is (`en`) unless the config gives the territory with
`ogLocales: { es: 'es_ES', en: 'en_GB' }`, which is what Open Graph expects.

### `ThemeToggle` and `ConsentBanner` texts through props

Both take `strings` (the interface catalogue), which is **optional**: without it, the default English
texts are used. A site with its own i18n can ignore the catalogue and pass individual texts; each prop
wins over `strings`, and whatever is not passed comes from it.

| Component | Text props |
| --- | --- |
| `ThemeToggle` | `label`: the button's accessible name. |
| `ConsentBanner` | `label` (region name), `message`, `acceptLabel`, `rejectLabel` and `privacyLabel` (the privacy link). |

### `FooterProps`: your own footer

Your own footer ([`site.components.Footer`](#your-own-footer-sitecomponentsfooter)) receives these
props (`import type { FooterProps } from '@velezanthony/design/integration'`):

| Prop | Type | What it is |
| --- | --- | --- |
| `lang` | `string` | Page language. |
| `siteName` | `string` | The config's `site.name`. |
| `year` | `number` | Build year, for the copyright. |
| `strings` | `UiStrings` | The language's interface texts, already merged with `i18n.ui`. |
| `privacyUrl` | `string \| undefined` | The language's `privacyUrl`; without it, there is no link to render. |
| `cookieControl` | `boolean` | `true` with analytics: there is a cookie choice to reopen. |
| `footer` | `FooterView \| undefined` | Licence, author and links from `site.footer`, already resolved for the language. |

`CookieSettingsButton` (above, in Atoms) is the "Cookie preferences" button of the library's footer:
it carries the `data-consent-open` attribute, which the consent script listens to.

## Next step

Every config option, for lookup: [All options](./opciones.md).
