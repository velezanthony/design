---
slug: guide/first-site
seo:
  title: "Your first documentation site"
  description: "Step by step to document a project: create the Astro subproject, install the library, write the three configuration files, add pages and deploy to GitHub Pages."
---

# Your first site

By the end of this page you will have a documentation site published on GitHub Pages, with search,
light and dark theme and a sidebar. You need Node `>=22.23.4` and a GitHub repository; the examples
put the site in a `docs/` folder inside the repo.

## 1. Create the subproject and install

```sh
npm create astro@latest docs -- --template minimal --no-git
npm install --prefix docs github:velezanthony/design#v0.2.0
npm install --prefix docs astro @astrojs/markdown-satteri
```

Delete `docs/src/pages/index.astro`: your home page will be an `index.md`.

:::note[Why it is installed this way]{collapsed}
- The library is not on npm: it is installed from GitHub, **pinned to a tag**. To update, change the
  tag and install again.
- `astro` and `@astrojs/markdown-satteri` are required because the library ships as source code and
  your Astro compiles it. Tailwind comes with the library.
- To check types with `astro check`, add `npm install --prefix docs -D @astrojs/check typescript`.
- The scaffold's `favicon.svg` and `favicon.ico` are not used unless you point `site.favicon` at them.
:::

## 2. The three files

::::tabs
:::tab[docs.config.mjs]
```js
// docs/docs.config.mjs: the configuration, written once
import { defineDocsConfig } from '@velezanthony/design/integration';

export default defineDocsConfig({
  site: { name: 'My project' },
  i18n: { locales: ['en'] },
});
```
:::
:::tab[astro.config.mjs]
```js
// docs/astro.config.mjs
import { defineDocsSite } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, { base: '/my-project', site: 'https://user.github.io' });
```
:::
:::tab[content.config.ts]
```ts
// docs/src/content.config.ts
export { collections } from '@velezanthony/design/content';
```
:::
::::

- **`base`** is required: GitHub Pages serves a project under `https://<user>.github.io/<repo>/`, so
  it is `'/<repo>'` (or `'/'` for a user or organisation site). **`site`** is your origin.
- The library brings Tailwind, the theme, the fonts, the routes and search: you write no layout and no
  CSS import.

## 3. Content

```text
docs/src/content/docs/
├── index.md          → /my-project/            (home)
└── guide/
    ├── index.md      → /my-project/guide/
    └── install.md    → /my-project/guide/install/
```

- **The title** is the first `# h1` (or the frontmatter `title`). Without either, the build fails.
- **Links** between pages are relative `.md` paths (`./install.md#requirements`): they work on GitHub
  and the library turns them into site URLs, checking the file and the anchor.
- **A `README.md`** acts as the `index.md` of its folder if the folder has none, as in MkDocs. The home
  page is optional: without `index.md` or `README.md`, you put your own in `src/pages/index.astro`.

Try it locally with `npm run dev --prefix docs`.

## 4. Configuration basics

The config has three groups and only `site.name` is required. Your editor autocompletes every option,
and a misspelt key breaks the build with its path.

```js
import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

export default defineDocsConfig({
  site: { name: 'My project', social: { github: 'https://github.com/user/my-project' } }, // look
  i18n: { locales: ['en', 'es'] }, // languages and texts
  content: {
    // which pages exist and how they are navigated
    nav: [
      { label: 'Tutorials', dir: 'tutorials' }, // a section with its own sidebar
      { label: 'Changelog', slug: 'changelog' }, // a single page
      { label: 'GitHub', href: 'https://github.com/user/my-project', icon: NavIcon.GITHUB },
    ],
    external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
    editUrl: 'https://github.com/user/my-project/edit/main',
  },
});
```

A text can be a string or one per language (`{ en: 'Tutorials', es: 'Tutoriales' }`). Options with a
closed set of values are constants (`NavIcon.GITHUB`), although plain strings work too.

## 5. Deploy to GitHub Pages

In the repo, **Settings → Pages → Source: GitHub Actions**, and add the workflow
`.github/workflows/docs.yml`: it builds `docs/` with `npm ci && npm run build` and publishes
`docs/dist`.

:::tip[The full workflow]{collapsed}
```yaml
name: Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: docs
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: docs/package-lock.json
      - uses: actions/configure-pages@v6
      - run: npm ci
      - run: npm run build
        env:
          PUBLIC_GTM_ID: ${{ secrets.PUBLIC_GTM_ID }}
      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
:::

- `PUBLIC_GTM_ID` is optional; with it, the config needs `site.analytics.privacyUrl` (see
  [Analytics and privacy](./idiomas-seo-y-analitica.md#analytics-and-privacy)).
- For the sitemap and listings to have dates, add `fetch-depth: 0` to `actions/checkout`.
:::note[Special cases]{collapsed}
- If the Astro project is the root of the repo, drop the `docs/` prefix (and `../CHANGELOG.md` becomes
  `./CHANGELOG.md`). If your pages already live in another folder, do not move them: see
  [Pages outside the project](./navegacion.md#pages-outside-the-astro-project-contentdir).
- A page of yours in `src/pages/` with the same route as one of the library's (`/`, `/sitemap.xml`)
  replaces it, and a warning is shown at start-up. The 404 page, `robots.txt` and the privacy policy
  belong to your site.
:::

## Next step

Write your pages: [Writing pages](./escribir-paginas.md).
