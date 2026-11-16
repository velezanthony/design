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

To type-check the site (`astro check`), add the tooling too: `npm install -D @astrojs/check typescript`
and a `"check": "astro check"` script. The Astro scaffold (`npm create astro`) has neither.

## Consumer setup

Paths below are written for a `docs/` folder inside the repo; in a project created with
`npm create astro` the Astro project is the repo root, so drop the `docs/` prefix and adjust the
relative paths (`../CHANGELOG.md` becomes `./CHANGELOG.md`). Start by deleting the scaffold page
`src/pages/index.astro`: the home is `src/content/docs/index.md`, and a page of your own on `/`, `/404`
or `/sitemap.xml` (or `/es/`, `/es/404` for other locales) fails the build, since Astro would
otherwise render it instead of the docs.

Declare the config once in `docs.config.mjs`. Astro drops custom properties from integrations, so the
loader cannot read the config from `astro.config.mjs`; both files import the same module instead.

```js
// docs/docs.config.mjs
import { defineDocsConfig, MissingTranslation } from '@velezanthony/design/integration';

export default defineDocsConfig({
  name: 'My repo',
  locales: ['en', 'es'],
  translations: { missing: MissingTranslation.LINK },
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
| `translations`  | `{ missing: MissingTranslation.LINK }` (`LINK`, `OMIT`, `FALLBACK`), default `LINK`. See below.                                  |
| `ui`            | Overrides of UI texts per locale, merged key by key: `ui: { es: { 'search.placeholder': 'Buscar' } }`. Unknown keys fail.        |
| `external`      | Files outside `src/content/docs/` published as pages: `{ slug, file, locales?, seo?, translations? }`.                          |
| `sidebar`       | Order of the sidebar: slugs and groups `{ label, slug?, items }`. The home is `'index'`. Unknown slugs fail the build. The rest goes after. |
| `nav`           | Header items, each section with its own sidebar: `{ label, dir, sidebar? }`, `{ label, slug }`, `{ label, href, icon? }`. See below. |
| `editUrl`       | Repo edit base (`https://github.com/o/r/edit/main`). Adds "Edit this page" pointing at the real source file.                    |
| `repoRoot`      | Repo root relative to the Astro project (default: nearest ancestor with `.git`). Needed for `editUrl` when there is no `.git`.  |
| `favicon`       | Tab icon: a file in `public/` (`'favicon.svg'` or `'/favicon.svg'`, must exist) or an `https://` URL. Default: the package's own icon. See below. |
| `gtmId`         | Google Tag Manager id. Loaded only after the visitor accepts the consent banner. Requires `privacyUrl`.                         |
| `privacyUrl`    | Privacy policy link of the banner and footer (`https://...` or a site path).                                                    |
| `layout`        | Collapsible sidebars and reading / full width: `{ sidebar?, toc?, width?, toggles? }`. See below.                               |
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

### `favicon`

Every page (docs, fallback routes and 404) emits `<link rel="icon" href type>`. By default the
package serves its own icon at `<base>/_design/favicon.png`, a namespaced path that never collides
with your `public/`. Set `favicon` to use yours:

```js
favicon: 'favicon.svg', // a file in public/ (with or without leading slash), href gets the base
favicon: 'https://cdn.example.dev/icon.png', // used as-is, not checked (http:// is rejected)
```

`type` is inferred from the extension (`svg`, `png`, `ico`; anything else omits it). A missing
`public/` file fails the build with the field and the file. The `public/favicon.svg` and
`public/favicon.ico` that the Astro scaffold ships are NOT used unless you point `favicon` at one;
delete them if you keep the default.

### `sidebar`

Entries are slugs (`'guide/install'`) or groups `{ label, slug?, items }`. The home page is written
`'index'` (its internal slug is empty). A slug that matches no page, in any language, fails the build
with one aggregated error naming each of them and its path (`sidebar[2].items[0]`). Pages not listed
go after the declared ones, by frontmatter `order`, then slug.

### `nav`

Header items after the site name (from `lg`; below it they open the mobile Menu, above the sidebar).
Without `nav` nothing changes: one top-level `sidebar` for the whole site.

```js
import { NavIcon } from '@velezanthony/design/integration';

nav: [
  { label: { en: 'Guide', es: 'Guía' }, dir: 'users', sidebar: ['users/install'] }, // section
  { label: 'Changelog', slug: 'changelog' }, // a single page
  { label: 'GitHub', href: 'https://github.com/o/r', icon: NavIcon.GITHUB }, // external, https only
],
```

- **Section** `{ label, dir, sidebar? }`: every page (native or external) whose slug is `dir` or starts
  with `dir/` belongs to it. Its pages show ONLY that section's tree on the left, and previous / next
  never leave it. `sidebar` orders the section (same shape as the top-level one, slugs must live
  inside `dir`); the rest follows by `order`, then slug, grouped under `dir` (the folder itself is not
  a level). The item links to the `dir` index page if it exists, else to the section's first page.
- **Page** `{ label, slug }`: a link to one page. That page belongs to no section.
- **Link** `{ label, href, icon? }`: external, `https://` only, with `rel="noopener"` and an external
  marker. With `icon` (`NavIcon.GITHUB`) only the icon is drawn and the label stays for screen readers.
- **Pages outside every section** (the home, single pages, anything else) use the top-level `sidebar`
  if you give one (entries that belong to a section are ignored) and, if not, an automatic list of
  just those pages. Previous / next stay among them.
- The current section or page carries `aria-current` (`page` on its own page, `true` on a section
  when you are inside it). `label` can be a string or per locale; a missing locale falls back to the
  default locale, like every other label. A page item whose page is not translated follows
  `translations.missing` (`link`/`fallback` point to the original, `omit` hides the item).
- Fails the build, aggregated with the config path (`nav[1].dir`): a `dir` with no pages, overlapping
  dirs (equal, or one inside the other), a section `sidebar` slug that is unknown or outside its
  `dir`, a page `slug` that is not a page or lives inside a section, and an `href` that is not https.
- UI texts: `nav.label` (the nav landmark) and `nav.external` (the marker for screen readers).

### `layout`

```js
import { LayoutWidth, PanelState } from '@velezanthony/design/integration';

layout: {
  sidebar: PanelState.OPEN, // 'open' (default) | 'collapsed': initial state of the navigation (lg and up)
  toc: PanelState.OPEN, // same for "On this page" (xl and up)
  width: LayoutWidth.READING, // 'reading' (default) | 'full'
  toggles: true, // false removes every control and ignores what a visitor saved
}
```

Each side column has a chevron button that folds it into a 44px rail (a vertical label and the
button; the panel is `inert` while folded). The header gets a Reading / Full switch (from `md` up).
In `full` the page and the header bar use the whole window and the text measure grows a little; code,
tables, tabs and images take the whole column whenever a side is folded or the width is `full`.
Below `lg` nothing changes: the navigation stays behind the "Menu". The visitor's choice is kept in
`localStorage` (`docs:layout`) and applied before first paint, so a reload does not jump. Animations
respect `prefers-reduced-motion`. Unknown values fail validation.

### `translations`

`MissingTranslation` is exported from `@velezanthony/design/integration` (value and type), so the
config reads `MissingTranslation.LINK`. In frontmatter YAML the same values are plain strings:
`translations: link | omit | fallback`.

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
Native pages link to each other with relative `.md` paths (`./guide.md`), and to an external file
with its real relative path (`../../../../CHANGELOG.md#anchor` from `src/content/docs/`). Relative
links to native or external files are resolved to the page URL in the language of the linking page
(falling back like the sidebar does) and validated, `#anchor` included; a relative path to a file that
is neither a page nor a declared asset fails the build. `https://` links are allowed but not validated.

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

## Transitions & image zoom

Pages use the View Transitions API, all of it behind `prefers-reduced-motion: no-preference` and with an instant fallback where the API is missing:

- **Navigation** (CSS only): the header, sidebar and table of contents stay still while the content fades in.
- **Theme toggle**: the new theme is revealed with a circle that grows from the button.
- **Tabs**: the panel cross-fades.
- **Mobile menu**: opens and closes smoothly where `::details-content` is supported.
- **Image zoom**: content images (`.prose img`) with a non-empty `alt` open in a modal `<dialog>` and morph from the thumbnail to the enlarged image. Decorative images (`alt=""`), images inside links, images declared smaller than 96px and images with `data-no-zoom` are left alone. The labels are the `zoom.open` and `zoom.close` UI strings.

## Strict build rules

The build fails on: a broken relative link or `#anchor`, a locale suffix that is not in `locales`
(`x.fr.md`), a page without `h1` or `title`, an unknown admonition, a missing external file, a missing
SEO image or `public/` favicon, conflicting translation policies and a sitemap over 50 000 URLs. Warnings: undeclared
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
npm run dev           # minimal root page
npm run playground:dev    # real-content consumer (snake-orm docs snapshot)
npm test              # Vitest
npm run lint          # ESLint
npm run format:check  # Prettier
npm run check         # astro check
```

`playground/` is a real consumer (npm workspace, the library is linked from `src/`, so edits hot-reload)
built from the official Astro scaffold plus a snapshot of the snake-orm docs, and it follows the
consumer setup above (it depends on `"file:.."` instead of `github:velezanthony/design#vX.Y.Z`). Regenerate it with
`scripts/migrate-mkdocs/run-snake-orm.sh <snake-orm checkout> <python with griffe2md>`.

CI runs lint, format, check and test on every push and pull request to `main`.

## Releasing

Bump `version` in `package.json`, commit, then tag that commit and push the tag:

```sh
git tag v0.1.0
git push origin v0.1.0
```
