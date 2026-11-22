---
slug: guide/navigation
seo:
  title: "Navigation, sidebar and folder indexes"
  description: "Organise the header and sidebar of your Astro docs, generate folder index pages with pagination, and publish external files, static folders and outside pages."
---

# Navigation and indexes

By the end of this page you will have the header and the sidebar in the order you want, pages that
list their own folder, and files from outside the content folder published.

## Header and sidebar

### The header (`content.nav`)

```js
import { NavIcon } from '@velezanthony/design/integration';

content: {
  nav: [
    { label: 'Tutorials', dir: 'tutorials' }, // section: everything under tutorials/
    { label: 'Guide', dir: 'guide', sidebar: ['guide/install', 'guide/configure'] }, // with its own order
    { label: 'Reference', sidebar: ['REFERENCE', 'changelog'] }, // section with no common folder
    { label: 'Changelog', slug: 'changelog' }, // a single page
    { label: 'GitHub', href: 'https://github.com/o/r', icon: NavIcon.GITHUB }, // external link
  ],
},
```

| Item | Shape | What it does |
| --- | --- | --- |
| Section | `{ label, dir?, sidebar? }` | Owns the pages in `dir` and the ones its `sidebar` names, wherever they live. It has its own sidebar and "previous / next" never leave it. It links to the index page of `dir` or, if there is none, to its first page. |
| Page | `{ label, slug }` | A link to a single page, which belongs to no section. |
| Link | `{ label, href, icon? }` | External, `https://` only. With `icon`, only the icon is shown. |

- **Order of a section:** its `sidebar`, and what it does not name comes after, by frontmatter `order`
  and then slug. **Without `sidebar`, it is alphabetical by slug.**
- **Pages outside every section** (the home page) use the general `sidebar` or, without one, an
  automatic list of just those pages.
- Without `nav`, there is a single sidebar for the whole site. From `lg` up the items sit in the
  header; below that, in the mobile menu.
- A page item whose page is not translated follows `i18n.missing` (`omit` hides it).

### The sidebar (`content.sidebar`)

```js
content: {
  sidebar: ['index', { label: 'Getting started', items: ['guide/install', 'guide/configure'] }, 'changelog'],
},
```

- Entries are slugs or groups `{ label, slug?, items }`. The home page is `'index'`, and
  `folder/index.md` is written `'folder'`.
- What you do not declare comes **after**, grouped by folder (one group per folder, with the title of
  its `index.md` if it has one) and sorted by `order` and slug.
- Declaring a folder's page (`'articles'`) places the whole group of that folder there.
- A group label links to its folder's page if there is one.

:::note[Which folder a hand-written group links to]{collapsed}
A hand-written group links to its folder's page (generated, `_index.md` or `index.md`) when its pages
share that folder and no inner group claims it; a group that only wraps another moves up to the folder
above. A hand-written `slug` wins.
:::

### Limit the tree depth (`tree.depth`)

Without a limit, the automatic tree has one group per folder at any depth. `tree.depth`, in
[`content.folders`](#per-folder-settings-contentfolders), trims it, counting from the folder that
declares it:

```js
import { ALL_FOLDERS } from '@velezanthony/design/integration';

content: {
  folders: {
    [ALL_FOLDERS]: { tree: { depth: 3 } }, // whole site: three levels from the root of each tree
    'articles/systems': { tree: { depth: 2 } }, // two levels from this folder
  },
},
```

**Nothing is hidden:** anything deeper goes flat into the last allowed group. The nearest declared
folder wins, then `'*'`, and it only affects automatic groups, not the ones written in `sidebar`.

### Show a folder's whole tree (`tree.show`)

```js
import { TreeShow } from '@velezanthony/design/integration';

content: { folders: { articles: { tree: { show: TreeShow.ALL } } } }, // SECTION (default) | ALL
```

With `ALL`, every page in the folder shows its whole tree: the folder's page at the top, each `nav`
section with pages inside as a group and, at the end, the pages without a section. "Previous / next"
walk that whole tree, jumping from one section to the next.

:::tip[If you come from MkDocs]{collapsed}
Without `sidebar`, pages do not come out in the order of the MkDocs `nav:`. Write each section's
`sidebar` with the same pages in the same order; the [migrator](./migrar-desde-mkdocs.md) generates it.
:::

### Search

It works with no configuration: it is **Pagefind**, a static index per language built at the end of
`astro build`. It indexes only the content of indexable pages (not the header, not the footer, not
`noindex`, pagination or fallback pages). The `/` key focuses the search box.

In development **there is no search**, because the index does not exist until a build finishes. To try
it:

```sh
npm run build && npm run preview
```

:::warning[What breaks the build]{collapsed}
All failures come out at once, with the key path (`content.nav[1].dir`): a `dir` without pages, two
overlapping `dir`s, a slug that is not a page, a page that would belong to two sections and an `href`
that is not `https://`.
:::

## Folder indexes

### Generate the index

::::tabs
:::tab[docs.config.mjs]
```js
import { ListingView } from '@velezanthony/design/integration';

content: {
  folders: {
    tutorials: { listing: { generate: true, view: ListingView.CARDS } },
  },
},
```
:::
:::tab[_index.md]
```md
<!-- tutorials/_index.md (optional): only the texts -->
---
seo:
  description: "Step-by-step tutorials, grouped by level."
---

# Tutorials

Step-by-step tutorials, from installation to deployment.
```
:::
::::

`/tutorials/` renders the body of `_index.md` and, below it, the listing. Whether there is an index is
decided by the config; `_index.md` only provides the texts.

- `_index.md` has no route of its own: its page is the folder's (`sidebar: ['tutorials']` links it).
  It is translated like any page (`_index.en.md`).
- `generate` is inherited: subfolders get their page too.
- Without `_index.md`, the page takes the title of the section or group for that folder (or the folder
  name) and the description "All pages in {title}.".
- Folder pages go into the sitemap and search; `seo.noindex: true` in their `_index.md` removes them.
  They do not appear as a leaf in the sidebar: their folder's group links them.

| In the folder | `generate` on | `generate` off (default) |
| --- | --- | --- |
| `index.md` | That page wins (the build reports it) | That page |
| `_index.md` | The index, with its texts | **Build error** with a hint naming the key |
| Neither | The index: title and listing | Nothing |

### How it looks

It lists the pages of the folder and its subfolders in sidebar order, with their title, summary
(`index.summary` or `seo.description`), path and the date of their last commit.

::::tabs
:::tab[List]
`view: ListingView.LIST` (default): the tree, with one `##` per section. Not paginated.
:::
:::tab[Table]
`view: ListingView.TABLE`: title, summary, section and date, newest first. Pages of 10.
:::
:::tab[Cards]
`view: ListingView.CARDS`: cards with a 16:9 cover, path, title, summary and date. Pages of 12.
:::
::::

:::note[Pagination, reserved names and dates]{collapsed}
- **Pagination** (table and cards): `/tutorials/page/2/`… Below, a "Per page" selector leads to each
  size, which is another static route (`/tutorials/per-page/24/`). Only page 1 of the default size is
  indexable.
- **Reserved names:** inside a folder with a listing, `page` and `per-page` belong to pagination; a
  page with that URL breaks the build.
- **Dates:** a page with no commit goes first and without a date. Without git, or in a shallow clone,
  there are no dates and the order is the tree's.
:::

### Covers

```yaml
index:
  summary: "Summary for the listing." # without it, seo.description
  image: ./cover.png # relative to the .md or from public/ (/covers/x.png) | false
  imageAlt: "What the image shows" # without it, it is decorative
```

Precedence: the page's `index.image` → `listing.covers` → the library's cover, a drawing made with the
theme tokens. A missing image warns and keeps the library's. With the
[explicit loader form](./opciones.md#explicit-loader-form), relative covers need
`schema: ({ image }) => docsSchema(image)`.

### Per-folder settings (`content.folders`)

Each key is a content folder without slashes (`articles/python`) or `'*'` (`ALL_FOLDERS`) for the
whole site. Each setting is inherited **separately** from the nearest declared folder, then from `'*'`
and then from the default.

```js
import { ALL_FOLDERS, ListingView, TreeShow } from '@velezanthony/design/integration';

content: {
  folders: {
    [ALL_FOLDERS]: { listing: { view: ListingView.LIST } },
    articles: {
      listing: { generate: true, view: ListingView.CARDS, pageSize: 12, perPageOptions: [12, 24, 48], covers: true },
      tree: { show: TreeShow.ALL, depth: 3 },
    },
    'articles/drafts': { listing: { generate: false } }, // switches a branch off
  },
},
```

A key that is neither `'*'` nor a folder with pages breaks the build with its path. The defaults of
each setting are in the [reference](./opciones.md#contentfolders).

### The section tree in a page (`::nav-tree`)

In a hand-written page, `::nav-tree` alone on its line renders, for each `nav` section, a `##` with its
label and its tree, with the title and `seo.description` of each page:

```md
::nav-tree{section="Advanced" descriptions="false"}
```

`section` keeps a single section (by its label or its `dir`) and `descriptions="false"` removes the
descriptions. A section that does not exist or an unknown attribute breaks the build with file and
line.

## External and static files

| You want… | Option |
| --- | --- |
| Publish the root `CHANGELOG.md` or `README.md` as pages | `content.external` |
| Serve a folder as is (an HTML coverage report) | `content.static` |
| Keep some `.md` files unpublished | `content.exclude` |
| Read pages from a folder outside the Astro project | `content.dir` |

### External files (`content.external`)

```js
content: { external: [{ slug: 'changelog', file: '../CHANGELOG.md' }] },
```

- `file` is an `.md` relative to the Astro project. `CHANGELOG.es.md` is its translation.
- Its relative links resolve against its real location, so GitHub and the site read the same source.
  From a native page, link it by its real path (`../../../../CHANGELOG.md`).
- It has no frontmatter: its `seo` and `translations` go in the entry.
- With `slug: 'index'` it is the home page (the root `README.md`, for example); if there is also an
  `index.md`, the build fails naming both.

### Static folders (`content.static`)

```js
content: { static: [{ from: '../htmlcov', to: 'coverage', exclude: ['*.py'] }] }, // → <base>/coverage/
```

- Published without Markdown or optimisation, outside search and the sitemap. `from` must exist at
  build time; `to` cannot be `_astro`, `pagefind` or a language.
- Link it with a path relative to its file (`[Coverage](../htmlcov/index.html)`): it is rewritten to
  the published URL.
- `exclude` leaves files out with the `content.exclude` rules, relative to `from`.

### Exclude files (`content.exclude`)

```js
content: { exclude: ['drafts/', '*.draft.md', '/notes.md', '!drafts/ready.md'] },
```

They follow `.gitignore` rules, relative to the content folder: a name without `/` matches at any
depth, a trailing `/` is a folder, `**` crosses folders and `!` includes again. The language suffix
counts (`*.es.md`). Excluded files are neither read nor published, and a link to one breaks the build
naming `content.exclude`. `external` files are not affected.

### Pages outside the Astro project (`content.dir`)

If the repo already keeps its docs as loose `.md` files (an MkDocs project's, for example), do not move
them: put the Astro project in its own folder and point `content.dir` at the usual one.

::::tabs
:::tab[Layout]
```text
repo/
├── docs/            # the pages, as they are
├── CHANGELOG.md
└── docs-site/       # Astro project
```
:::
:::tab[docs-site/docs.config.mjs]
```js
// docs-site/docs.config.mjs
content: {
  dir: '../docs', // relative to the root of the Astro project
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
  repoRoot: '..',
},
```
:::
::::

Everything resolves against each file's real location (links, anchors, images, "Edit this page"), and
`astro dev` watches the folder.

:::note[`content.dir` details]{collapsed}
- Do not call the Astro project `site/`: that is where MkDocs writes its output.
- URLs and absolute paths are rejected. A chosen folder that does not exist breaks the build; the
  default one (`src/content/docs`) is optional.
- An image without `./` (`img/x.png`) is treated as `./img/x.png`.
:::

## Next step

Publish in several languages, tune SEO and add analytics:
[Languages, SEO and analytics](./idiomas-seo-y-analitica.md).
