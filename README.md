# @velezanthony/design

A library, not a site. It holds the design system and the Astro docs integration that the
documentation of [velezanthony](https://github.com/velezanthony)'s repositories is built with,
so every repo's docs look and behave the same.

It gives a consumer repo, from a single config file: localized pages (`en`/`es`), the layout,
sidebar, table of contents, search (Pagefind, per language), light/dark theme, an analytics consent
banner, SEO head tags, `sitemap.xml`, and a `404.html` that answers in the visitor's language. It can
also publish root files such as `README.md` or `CHANGELOG.md` as pages, so GitHub and the docs site
read the same source.

## Requirements

- Node `>=22.23.4`
- Astro `^7.4.12`
- Tailwind CSS `^4.3.5` with `@tailwindcss/vite`
- `@astrojs/markdown-satteri` `>=0.4.10 <0.5` (the Markdown processor Astro 7 uses; a custom Sätteri
  processor of your own is respected, any other processor fails the build)

The four are peer dependencies: install them in the consumer.

## Install

It is not published to npm. Install it from GitHub, pinned to a release tag:

```sh
npm install github:velezanthony/design#v0.1.0
npm install astro tailwindcss @tailwindcss/vite @astrojs/markdown-satteri
```

The package ships TypeScript and `.astro` sources (no build step); Astro compiles them. To update,
change the tag and install again.

## Consumer setup

Declare the config once in `docs.config.mjs`. Astro drops custom properties from integrations, so the
loader cannot read the config from `astro.config.mjs`; both files import the same module instead.

```js
// docs/docs.config.mjs
import { defineDocsConfig } from '@velezanthony/design/integration';

export default defineDocsConfig({
  name: 'My repo',
  locales: ['en', 'es'],
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
});
```

```js
// docs/astro.config.mjs
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { docs } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineConfig({
  site: 'https://velezanthony.github.io', // required
  base: '/my-repo',
  trailingSlash: 'always',
  vite: { plugins: [tailwindcss()] },
  integrations: [docs(docsConfig)],
});
```

```ts
// docs/src/content.config.ts
import { defineCollection } from 'astro:content';
import { docsLoader, docsSchema } from '@velezanthony/design/loader';
import docsConfig from '../docs.config.mjs';

export const collections = {
  docs: defineCollection({ loader: docsLoader(docsConfig), schema: docsSchema() }),
};
```

Put native pages in `docs/src/content/docs/`. The library injects every route (pages, `404`,
`sitemap.xml`), the theme, the fonts (IBM Plex) and the search index; the consumer writes no layout,
no CSS import and no `@source`.

Native pages: `index.md` is the home, `guide.md` is `/guide/`, `guide.es.md` is its Spanish twin
(the default locale has no suffix). The title is the first `h1` (or frontmatter `title`); a page
without either fails the build.

## Config reference

Unknown keys fail the build with the path of the key (`ui.es.search.placeholdr`).

| Option          | Meaning                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | Site name (header, footer, default title template). Required.                                                                   |
| `locales`       | Languages, `en` and `es` have built-in UI texts. Default `['en']`.                                                              |
| `defaultLocale` | Unsuffixed files and `/`. Default: the first locale.                                                                            |
| `seo`           | Site-wide SEO base, see below.                                                                                                  |
| `translations`  | `{ missing: 'link' \| 'omit' \| 'fallback' }`, default `'link'`. See below.                                                     |
| `ui`            | Overrides of UI texts per locale, merged key by key: `ui: { es: { 'search.placeholder': 'Buscar' } }`. Unknown keys fail.        |
| `external`      | Files outside `src/content/docs/` published as pages: `{ slug, file, locales?, seo?, translations? }`.                          |
| `sidebar`       | Order of the sidebar: slugs and groups `{ label, slug?, items }`. What is not listed goes after, by frontmatter `order`, slug.  |
| `editUrl`       | Repo edit base (`https://github.com/o/r/edit/main`). Adds "Edit this page" pointing at the real source file.                    |
| `repoRoot`      | Repo root relative to the Astro project (default: nearest ancestor with `.git`). Needed for `editUrl` when there is no `.git`.  |
| `gtmId`         | Google Tag Manager id. Loaded only after the visitor accepts the consent banner. Requires `privacyUrl`.                         |
| `privacyUrl`    | Privacy policy link of the banner and footer (`https://...` or a site path).                                                    |
| `social`        | `{ github }`.                                                                                                                   |

### `seo`

```js
seo: {
  titleTemplate: '%s | My repo', // default '%s · <name>', must contain %s
  description: { en: 'My repo docs', es: 'Documentación de mi repo' }, // string or per locale
  image: { src: '/og.png', alt: { en: 'Card', es: 'Tarjeta' } }, // under public/ or absolute https
}
```

A page overrides the base field by field: frontmatter `seo` on native pages, `external[].seo` on
external ones. Shape: `{ title?, description?, image?: { src, alt? }, noindex? }`. The OG image should
be about 1.91:1 and under 300 KB (a warning otherwise). `noindex` pages leave `sitemap.xml` and search.

### `translations`

When a page exists in one language and not in another, `translations.missing` decides what the other
language shows: `link` (the sidebar links to the original, badged with its language), `omit` (nothing)
or `fallback` (the original is rendered under the other language's URL with a notice, `noindex` and a
canonical to the original). A page overrides the base: frontmatter `translations: omit` on native pages,
`external[].translations` on external ones. Files of one page that disagree fail the build; a missing
twin with no declared policy only warns.

### External files

`external[].file` is relative to the Astro project (`../CHANGELOG.md`). `CHANGELOG.es.md` is its
Spanish twin. The default-locale file is required, `locales` makes the others required too. Relative
links and images inside them are resolved against their real location, so they keep working on GitHub.
Native pages link to each other with relative `.md` paths (`./guide.md`).

## Markdown

Both syntaxes produce the same admonition, `note | info | tip | warning | danger | question`:

```md
> [!NOTE]
> GitHub alert (NOTE, TIP, IMPORTANT, WARNING, CAUTION). Renders in GitHub too.

:::tip[Custom title]
Directive admonition.
:::

:::warning[Folded]{collapsed}
Collapsed into a `<details>`.
:::
```

Tabs (without JavaScript the panels stack with visible labels):

```md
::::tabs
:::tab[npm]
npm i x
:::
:::tab[pnpm]
pnpm add x
:::
::::
```

Code blocks use Shiki (`github-light` / `github-dark`); `django` is highlighted as `jinja` and `pycon`
as `python`. Not supported: `{ #id }` custom heading ids and Material icons (`:material-x:` stays text).
Unknown container names (`:::foo`) fail the build; stray colons (`12:30`, `http://`) are left alone.

## Strict build rules

The build fails on: a broken relative link or `#anchor`, a locale suffix that is not in `locales`
(`x.fr.md`), a page without `h1` or `title`, an unknown admonition, a missing external file, a missing
SEO image, conflicting translation policies and a sitemap over 50 000 URLs. Warnings: undeclared
missing translations, an oversized or badly proportioned OG image, an unknown Shiki language.

## Deploying to GitHub Pages

- `site` must be the user origin and `base` the repo path; the build is fully static.
- `sitemap.xml` (with `hreflang` alternates) is emitted at `<base>/sitemap.xml`; there is no
  `robots.txt` (the portfolio at the user origin owns it).
- GitHub Pages serves a single `<base>/404.html`. It is in the default locale and swaps itself for
  the language of the failed URL (`/repo/es/nope/` shows Spanish, the URL does not change).
- The search index is built after `astro build` into `dist/pagefind/`; search needs a production build.
- Theme and consent are stored in `localStorage` under `theme` and `consent`, so they are shared
  with any site on the same origin that uses the same keys.
- Installing from `github:` in CI needs a token if this repository is private.

## Development

```sh
npm install
npm run dev           # playground
npm test              # Vitest
npm run lint          # ESLint
npm run format:check  # Prettier
npm run check         # astro check
```

CI runs lint, format, check and test on every push and pull request to `main`.

## Releasing

Bump `version` in `package.json`, commit, then tag that commit and push the tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```
