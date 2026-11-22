---
slug: guide/languages-seo-analytics
seo:
  title: "Multilingual docs, SEO and consent analytics"
  description: "Publish your Astro docs in several languages with translated URLs, tune titles, descriptions, Open Graph and the sitemap, and add Google Tag Manager with consent."
---

# Languages, SEO and analytics

By the end of this page you will have the site in several languages, the SEO of each page tuned and, if
you want it, analytics with a cookie notice that loads nothing before the visitor accepts.

## Languages

### The usual case

::::tabs
:::tab[docs.config.mjs]
```js
import { MissingTranslation } from '@velezanthony/design/integration';

i18n: { locales: ['en', 'es'], missing: MissingTranslation.LINK },
```
:::
:::tab[Files]
```text
src/content/docs/
├── index.md              → /
├── index.es.md           → /es/
└── tutorials/
    ├── installation.md    → /tutorials/installation/
    └── installation.es.md → /es/tutorials/installation/
```
:::
::::

- The first language (or `i18n.defaultLocale`) has no suffix in the file name and no prefix in the URL.
- `x.es.md` is the translation of `x.md`. A suffix not in `locales` breaks the build.
- Only `es` and `en` ship interface texts; another language needs them added to the package.

### A translated URL (`slug`)

```yaml
# tutorials/installation.es.md
---
slug: tutoriales/instalacion
---
```

The Spanish page is published at `/es/tutoriales/instalacion/` and the English one stays at
`/tutorials/installation/`.

- Translations are still paired by **file name**, and the config (`sidebar`, `nav`, `footer`) still
  names them by it.
- The `slug` is the full path, without language, `base` or slashes at the ends. The language switcher,
  `hreflang`, sitemap, sidebar, listings and search all use it.
- In an `_index.es.md`, it moves the folder listing (`/es/tutoriales/page/2/`).

:::warning[Which `slug` breaks the build]{collapsed}
A malformed `slug` (empty, with a trailing slash, with `..`, with a language prefix or ending in
`/index`), two files with the same URL in one language, or a `slug` that clashes with a route of the
library or of your `src/pages/`.
:::

### When a translation is missing (`i18n.missing`)

| Policy | Sidebar in the other language | URL in the other language |
| --- | --- | --- |
| `link` (default) | Links to the original, with its language badge | Does not exist |
| `omit` | Does not appear | Does not exist |
| `fallback` | Appears as normal | Shows the original with a notice, `noindex` and a canonical to the original |

- A page changes the policy with `translations: omit` in its frontmatter. Every version of a page must
  match.
- A missing translation with no declared policy only warns.

:::tip[If you come from MkDocs]{collapsed}
Its `fallback_to_default: true` is `fallback`, and `false` is close to `omit`.
:::

### Interface texts (`i18n.ui`)

```js
i18n: { ui: { en: { 'search.placeholder': 'Search the guide' } } },
```

They are merged key by key with the package's. A misspelt key breaks the build with its path.

## SEO and sitemap

### The site base and what each page changes

::::tabs
:::tab[docs.config.mjs]
```js
// docs.config.mjs
site: {
  seo: {
    titleSuffix: 'My project', // text, one per language, or false; defaults to site.name
    description: { en: 'My project docs', es: 'Documentación de mi proyecto' },
    image: { src: '/og.png', alt: 'Project card' }, // in public/ or https
    ogLocales: { en: 'en_GB', es: 'es_ES' }, // optional: og:locale with territory
  },
},
```
:::
:::tab[A page's frontmatter]
```yaml
# a page's frontmatter: wins field by field
---
seo:
  title: Install on any system # only in the <head>; the h1 does not change
  description: How to install the project.
  image: { src: /og-install.png, alt: Screenshot of the first run }
---
```
:::
::::

- **The title** is built as `title | suffix`. Each part is resolved separately: page > site >
  `site.name`. `titleSuffix: false` removes the suffix; if title and suffix are the same, it is not
  repeated.
- **The OG image** should be about 1.91:1 (1200×630) and weigh under 300 KB; otherwise the build warns.
  Without `alt`, it uses the page title.
- **`seo.noindex: true`** removes the page from the sitemap and search.
- In an `external` file, the same block goes in `content.external[].seo`.

### Structured data (JSON-LD)

The library injects none on its own: you declare them and it validates and renders them.

```js
site: { seo: { schema: [{ '@type': 'SoftwareSourceCode', name: 'My project' }] } }, // every page
```

In a page, `seo.schema: [...]` is **added** to the site's and `seo.schema: false` leaves it with none.
Each schema needs `@type`; if `@context` is missing, `https://schema.org` is added. The config travels
as JSON: compute the objects at build time and pass them ready-made.

### `sitemap.xml`

Published at `<base>/sitemap.xml`, with the `hreflang` alternates. Real, indexable pages go in, including
those in your `src/pages/` (keep them out with `<meta name="robots" content="noindex">`).

- `<lastmod>` is the date of the file's last commit. In CI, use `fetch-depth: 0` in
  `actions/checkout`: a shallow clone gives no dates.
- **Several sites on one domain:** the root site can turn its `sitemap.xml` into an index of the others
  with `site.seo.sitemap: { include: ['/project-a/sitemap.xml'] }` (paths on the same origin).
- **What the library does not add:** `robots.txt`, the 404 page (GitHub Pages serves one per domain)
  or the Search Console verification tag. Submit the `sitemap.xml` to Search Console and verify the
  property via DNS or with Analytics.

### The SEO panel (development only)

With `astro dev`, the site has three extra pages to review SEO **while you write**. With `astro build`
they do not exist.

| Route | What it shows |
| --- | --- |
| `/seo-on-page/` | Overview: pages with errors, warnings or info only, by severity and by type. |
| `/seo-on-page/pages/` | One row per page and language: final `<title>` and its length, source of the description and issues. Filters in the URL, no JavaScript. |
| `/seo-on-page/page/?slug=…&locale=…` | Inspector: search result and social card preview, canonical, JSON-LD, headings and translations side by side. |

:::note[What it checks and how]{collapsed}
- It uses the same functions that build the `<head>`, so what you see is what gets published. Your
  `src/pages/` pages are read as a visitor sees them.
- Guide limits: `<title>` from 15 to 60 characters, description from 70 to 160 and a single H1. It also
  warns about duplicates, skipped heading levels, missing translations, images without `alt`, links to
  `noindex` pages and orphan pages.
- Each issue says **what to change and in which file** (`seo.description` in the frontmatter, or
  `external[].seo` in the config for an external file).
- With no filters, the table shows errors and warnings; "Hide noindex" removes those pages from view.
:::

## Analytics and privacy

### Turn it on in two steps

1. Provide the Google Tag Manager container id, preferably in the build environment:

::::tabs
:::tab[Environment variable]
```sh
# .env (dev) or .env.production (build); add them to your .gitignore.
PUBLIC_GTM_ID=GTM-XXXXXXX
```

In GitHub Actions, pass it to the build step (as a _secret_ or a variable; the id is public on the
page anyway):

```yaml
- run: npm run build
  env:
    PUBLIC_GTM_ID: ${{ secrets.PUBLIC_GTM_ID }}
```
:::
:::tab[In the config]
```js
site: { analytics: { gtmId: 'GTM-XXXXXXX' } },
```

It wins over the environment. Use it only if a repo must always pin the same container.
:::
::::

2. Declare your privacy policy, which analytics requires:

   ```js
   site: { analytics: { privacyUrl: 'https://my-domain.dev/privacy/' } },
   ```

With that, visitors see the consent notice, GTM loads only after they accept and the footer gets a
"Cookie preferences" button so they can change their mind. **Without `PUBLIC_GTM_ID` there is
nothing:** no script, no notice, no button, nothing stored in the browser. A local build or a fork's
build has no tracking.

### Which combinations work

| `site.analytics` | Result |
| --- | --- |
| `gtmId` (or `PUBLIC_GTM_ID`) + `privacyUrl` | Analytics, cookie notice and footer link |
| `privacyUrl` only | Only the footer link |
| `gtmId` only | `astro build` fails naming `privacyUrl`; `astro dev` warns and starts without analytics |
| Neither | Nothing |

:::note[Id format and where it is read from]{collapsed}
- The id must be `GTM-` followed by capital letters and digits; otherwise the build fails (the message
  never prints the value). A blank value counts as undefined.
- `dev` reads `.env.development` and `build` reads `.env.production`; CI environment variables win over
  the files, and `site.analytics.gtmId` wins over everything.
:::

- `privacyUrl` accepts one URL per language (`{ en: '…', es: '…' }`); a language without an entry uses
  the default language's.
- The library generates no privacy page: your site publishes it, once for the whole domain.

:::note[Consent in the browser]{collapsed}
- The choice is stored in `localStorage` under `consent`, with a version: if what you ask for changes,
  bumping the version asks again.
- Withdrawing consent is as easy as giving it: the footer button reopens the notice. A later rejection
  deletes the domain's analytics cookies and reloads the page.
- `consent` and `theme` live on the origin (`user.github.io`), so every site on the domain shares the
  visitor's choice.
:::

In a page of your own with `BaseLayout`, `@velezanthony/design/site` gives you `gtmId` and
`privacyUrl(locale)` already resolved (see [Your own pages](./personalizar.md#your-own-pages)).

## Next step

Change the look and add your own pages: [Customise](./personalizar.md).
