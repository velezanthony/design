---
slug: guide/options
seo:
  title: "Configuration reference: every option"
  description: "Every defineDocsConfig option for site, i18n and content, with its type, default and where it is explained, plus defineDocsSite and the explicit loader form."
---

# All options

This page lists **every** `defineDocsConfig` option, group by group. To learn how to use them, start
with [Your first site](./primer-sitio.md#4-configuration-basics); here are the details of each key.

## How to read it

The config has three groups: **`site`** (how the site looks and presents itself), **`i18n`** (languages
and texts) and **`content`** (which pages exist and how they are navigated). Only `site.name` is
required.

- **Typed.** `defineDocsConfig` does nothing at run time: it only provides types, so your editor
  autocompletes every option and flags the ones that do not exist.
- **Strict.** An unknown key breaks the build with its path (`i18n.ui.es.search.placeholdr`).
- **Constants.** Options with a closed set of values are constants exported by
  `@velezanthony/design/integration`: `ListingView`, `TreeShow`, `ALL_FOLDERS`, `MissingTranslation`,
  `PanelState`, `LayoutWidth` and `NavIcon`. Literal strings (`'cards'`) work too.
- **Translatable texts.** Where the table says "text", a string for every language or an object per
  language works (`{ en: 'Guide', es: 'Guía' }`); a missing language uses the default language's.

## `site`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `site.name` | string | — (required) | Site name: header, footer and default title suffix. |
| `site.favicon` | string | The package's icon | Tab icon: a file in `public/` (`'favicon.svg'` or `'/favicon.svg'`, must exist) or an `https://` URL. See [The tab icon](./personalizar.md#the-tab-icon-sitefavicon). |
| `site.theme` | string | — | Your own CSS, a path from the project root (`'src/styles/site.css'`, must exist and end in `.css`): `@theme` tokens and styles compiled with the library theme. See [Your own CSS](./personalizar.md#your-own-css-sitetheme). |
| `site.social.github` | string | — | Repository URL. Provides the footer's "Repository" and "Report a bug" links. |
| `site.components.Footer` | string | The library's footer | Path of an `.astro` file from the project root that replaces the footer. It is the only `components` key. See [Your own footer](./personalizar.md#your-own-footer-sitecomponentsfooter). |
| `site.footer.license` | string or `{ label, href }` | — | Licence: just the name (`'MIT'`) or with an `https://` link. |
| `site.footer.author` | `{ name, href }` or `false` | The library's maintainer | Footer signature; `href` is `https://`. `false` hides it. |
| `site.footer.links` | list of `{ label, slug }` or `{ label, href }` | — | Footer links: a page (`slug`) or an external `https://` link (`href`), only one of the two. See [The footer](./personalizar.md#the-footer-of-docs-pages-sitefooter). |
| `site.layout.sidebar` | `PanelState` (`OPEN`, `COLLAPSED`) | `OPEN` | Initial state of the sidebar (from `lg`). |
| `site.layout.toc` | `PanelState` | `OPEN` | Initial state of "On this page" (from `xl`). |
| `site.layout.width` | `LayoutWidth` (`READING`, `FULL`) | `READING` | Reading or full width. |
| `site.layout.toggles` | boolean | `true` | `false` removes the collapse and width controls and ignores what the visitor saved. |
| `site.layout.tocDepth` | integer from 2 to 6 | `3` | Last heading level "On this page" lists. |
| `site.layout.tocMaxHeight` | CSS length (`px`, `rem`, `em`, `vh`, `dvh`, `svh`) | No limit | Maximum height of the table of contents; past it, the list scrolls inside. |
| `site.seo.titleSuffix` | text or `false` | `site.name` | Suffix of the `<title>`. `false`: none. See [The title](./idiomas-seo-y-analitica.md#the-site-base-and-what-each-page-changes). |
| `site.seo.description` | text | — | Description of the pages that bring none of their own. |
| `site.seo.image` | `{ src, alt }` | — | Image for sharing: `src` in `public/` (`/og.png`) or `https://`; `alt` (text) is required here. |
| `site.seo.schema` | list of JSON-LD objects | — | Structured data for every page. See [JSON-LD](./idiomas-seo-y-analitica.md#structured-data-json-ld). |
| `site.seo.ogLocales` | `{ [language]: 'language_TERRITORY' }` | The language itself | `og:locale` with territory (`{ es: 'es_ES' }`). Each key must be in `i18n.locales`. |
| `site.seo.sitemap.include` | list of paths or URLs on the same origin | `[]` | Turns `sitemap.xml` into an index with other sitemaps of the domain. See [Sitemap](./idiomas-seo-y-analitica.md#sitemapxml). |
| `site.analytics.gtmId` | string (`GTM-…`) | `PUBLIC_GTM_ID` from the environment | Google Tag Manager container; wins over the environment. See [Analytics](./idiomas-seo-y-analitica.md#analytics-and-privacy). |
| `site.analytics.privacyUrl` | URL or site path, or one per language | — | Privacy policy linked from the footer and the cookie notice. Required with analytics; without analytics, it only adds the footer link. |

## `i18n`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `i18n.locales` | list of languages | `['en']` | Site languages. Only `en` and `es` have interface texts in the package. |
| `i18n.defaultLocale` | language | The first in `locales` | Language of files without a suffix and of URLs without a prefix. |
| `i18n.missing` | `MissingTranslation` (`LINK`, `OMIT`, `FALLBACK`) | `LINK` | What someone browsing a language without a translation sees. See [Languages](./idiomas-seo-y-analitica.md#when-a-translation-is-missing-i18nmissing). |
| `i18n.ui` | `{ [language]: { [key]: text } }` | `{}` | Overrides interface texts, key by key (`{ en: { 'search.placeholder': 'Search' } }`). An unknown key breaks the build. |

## `content`

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `content.dir` | relative path | `'src/content/docs'` | Folder of the native pages, relative to the root of the Astro project; it can be outside (`'../docs'`). See [Pages outside the project](./navegacion.md#pages-outside-the-astro-project-contentdir). |
| `content.exclude` | list of patterns | `[]` | Patterns (`.gitignore` style) of the `content.dir` `.md` files that are not published. See [Exclude files](./navegacion.md#exclude-files-contentexclude). |
| `content.external` | list of `{ slug, file, locales?, seo?, translations? }` | `[]` | `.md` files from outside the content folder published as pages. See [External files](./navegacion.md#external-files-contentexternal). |
| `content.static` | list of `{ from, to, exclude? }` | — | Folders published as they are. See [Static folders](./navegacion.md#static-folders-contentstatic). |
| `content.editUrl` | URL | — | Edit base of the repo (`https://github.com/o/r/edit/main`): adds "Edit this page" pointing at the real source file. |
| `content.repoRoot` | relative path | The nearest ancestor with `.git` | Repo root relative to the Astro project, for the `editUrl` paths. Needed when there is no `.git`. |
| `content.nav` | list of sections, pages and links | — | Header items: `{ label, dir?, sidebar? }`, `{ label, slug }` or `{ label, href, icon? }`. See [Navigation](./navegacion.md#header-and-sidebar). |
| `content.sidebar` | list of slugs and groups `{ label, slug?, items? }` | Automatic folder tree | Order of the general sidebar. The home page is `'index'`. |
| `content.folders` | `{ [folder or '*']: { listing?, tree? } }` | `{}` | Per-folder settings, inherited from parent to child (table below). |

### `content.external[]`

| Field | What it does |
| --- | --- |
| `slug` | Page slug, without slashes at the ends. `'index'` is the home page; `'guide/index'` is `guide`. |
| `file` | Local path of an `.md`, relative to the Astro project (`'../CHANGELOG.md'`). |
| `locales` | Languages that must exist (`CHANGELOG.es.md`…); each must be in `i18n.locales`. |
| `seo` | The same block as the [frontmatter](./escribir-paginas.md#frontmatter) `seo`. |
| `translations` | Translation policy for this page (`MissingTranslation`). |

### `content.nav[]`

| Field | What it does |
| --- | --- |
| `label` | Item text (translatable text). |
| `dir` | Section: the folder whose pages belong to it, without slashes at the ends. |
| `sidebar` | Section: order and pages of its sidebar (same shape as `content.sidebar`). Only in a section. |
| `slug` | Page: the slug of a page that belongs to no section. |
| `href` | External `https://` link. |
| `icon` | Only in a link: `NavIcon.GITHUB` renders the icon and keeps the `label` for screen readers. |

### `content.folders`

Each key is the path of a content folder without slashes (`articles/python`) or `'*'` (`ALL_FOLDERS`)
for the whole site. Each setting is inherited separately from the nearest declared folder, then from
`'*'` and then from the default. See [Folder indexes](./navegacion.md#per-folder-settings-contentfolders).

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `listing.generate` | boolean | `false` | Gives the folder (and its subfolders) a generated index page. |
| `listing.view` | `ListingView` (`LIST`, `TABLE`, `CARDS`) | `LIST` | How the listing is rendered. |
| `listing.pageSize` | integer from 1 to 500 | 12 for cards, 10 for table | Entries per page. The list is not paginated. |
| `listing.perPageOptions` | list of integers from 1 to 500 | `[12, 24, 48]` or `[10, 25, 50]` | Options of the "Per page" selector; `pageSize` is added if missing. |
| `listing.covers` | boolean | `true` | `true`: the library's cover for entries without an image. `false`: no image. |
| `tree.show` | `TreeShow` (`SECTION`, `ALL`) | `SECTION` | Which tree the sidebar shows on the folder's pages. |
| `tree.depth` | positive integer | No limit | Levels of folder groups in the automatic tree, counted from the folder that declares it. |

## Cross-key checks

These checks look at more than one group and break the build with the full path:

- a language in `site.seo.ogLocales`, `site.analytics.privacyUrl` or `content.external[].locales` that
  is not in `i18n.locales`;
- an `i18n.defaultLocale` or an `i18n.ui` language that is not in `i18n.locales`;
- two overlapping `content.static[].to`, or a `to` that is `_astro`, `pagefind` or a language.

## `defineDocsSite(docsConfig, options)`

The short form of `astro.config.mjs`. It returns the Astro config.

| Option | Default | What it does |
| --- | --- | --- |
| `base` | — (required) | Path the site is served under: `'/my-repo'` for a GitHub Pages project page, `'/'` for a user or organisation site. Must start with `/`. |
| `site` | `'https://velezanthony.github.io'` | Absolute origin of the site, for the sitemap and canonical URLs. |
| `astro` | — | More Astro config. `integrations` and `vite.plugins` are added after `docs()`; the other `vite` keys are merged shallowly and the other top-level keys override the defaults (for example `trailingSlash`, which defaults to `'always'`). |

::::tabs
:::tab[Short form]
```js
export default defineDocsSite(docsConfig, {
  base: '/my-repo',
  site: 'https://example.dev',
  astro: { integrations: [myIntegration()], vite: { plugins: [myPlugin()] } },
});
```
:::
:::tab[Long form]
```js
import { defineConfig } from 'astro/config';
import { docs } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineConfig({
  site: 'https://example.dev', // required in the long form
  base: '/my-repo',
  trailingSlash: 'always',
  integrations: [docs(docsConfig)], // also registers the Tailwind plugin
});
```
:::
::::

- In the long form, `site` is **required**: without it, the integration fails because the sitemap and
  canonical URLs need an absolute origin.
- `markdown.processor` must stay Sätteri: with another processor, `docs()` fails with a clear error.
- Editing `docs.config.mjs` restarts `astro dev`.

## The collection (`content.config.ts`)

```ts
// src/content.config.ts
export { collections } from '@velezanthony/design/content';
```

One line, without importing the config: the collection takes the one `docs(config)` already resolved.
It needs the integration registered; without `docs(config)` in `astro.config.mjs`, the build fails
with an error that says so. The collection **must be called `docs`**.

### Explicit loader form

If you need to set up the collection yourself (for example, to add another one), use `docsLoader` with
the **same** object you give `docs()`:

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { docsLoader, docsSchema } from '@velezanthony/design/loader';
import docsConfig from '../docs.config.mjs';

export const collections = {
  // `image` lets relative index covers go through astro:assets.
  docs: defineCollection({
    loader: docsLoader(docsConfig),
    schema: ({ image }) => docsSchema(image),
  }),
};
```

With plain `docsSchema()`, a relative cover falls back to the library's.

## Next step

If you come from MkDocs: [Migrate from MkDocs](./migrar-desde-mkdocs.md).
