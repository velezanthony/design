---
slug: internals/maintenance
seo:
  title: "Maintenance: commands, conventions and tests"
  description: "The repo commands, code and commit conventions, the testing policy and where each test lives, and the steps to add a component, an option, a text or a language."
---

# Maintenance

This page gathers what you need to work on the repo: the commands, the conventions, how things are
tested and the steps for the usual changes.

## Commands

Requirements: Node `>=22.23.4` (CI uses Node 24). One `npm install` at the root installs the library and
both workspaces. Everything runs from the root:

::::tabs
:::tab[Development]
| Command | What it does |
| --- | --- |
| `npm run docs:dev` | This site, reloading when `src/` changes. |
| `npm run playground:dev` | The playground. |
| `npm run dev` | The minimal root page, without the integration. |
| `npm run docs:build` / `playground:build` | Full build, with the search index. |
:::
:::tab[Tests]
| Command | What it does |
| --- | --- |
| `npm test` / `npm run test:watch` | Vitest, once or in watch mode (tests in `src/` and `scripts/`). |
| `npm run test:coverage` | Vitest with V8 coverage (what CI runs). |
| `npm run test:mutation` | Stryker: measures whether the tests notice a change in the code. |
:::
:::tab[Quality]
| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint, with the layer rule. |
| `npm run format` / `format:check` | Prettier writes or only checks. It does not touch `.md` files, which are wrapped by hand. |
| `npm run check` | `astro check`: the types of `.ts` and `.astro`. |
| `npm run docs:check` / `playground:check` | `astro check` for this site or the playground. |
:::
::::

CI (`ci.yml`) runs `lint`, `format:check`, `check`, `docs:check` and `test:coverage` on every push and
pull request to `main`. `docs.yml` builds and deploys this site on every push to `main`.

## Conventions

- **Code in English; comments, errors and tests in Spanish.** Comments explain the **why**, and
  `describe`/`it` read as sentences. The documentation is in Spanish and every page has its English
  translation (`x.en.md`).
- **Conventional commits** (`feat(nav): …`, `fix(theme): …`): the scope is the area touched and the
  subject describes the behaviour that changes.
- **No `enum`** (the package ships uncompiled `.ts`): `as const` objects with their derived type.
- **Exported closed values** from `@velezanthony/design/integration`, with their type and schema
  (`z.enum(Object.values(X))`); `public-api.test.ts` guards it (rule N12).
- **Helpful errors:** a `DocsError` with file, line and hint, accumulated to show them all. Data that
  is not needed is never printed (such as the value of `PUBLIC_GTM_ID`).
- **Strict by default:** if something cannot work, it breaks the build; if it could be better, it
  warns.
- **Parameters as an object** (N9): two or more optional parameters go in a named object
  (`buildListing({ context, contentLocale, folder, details })`).
- **What CSS cannot tell apart is marked in the HTML, positively** (N8): a screenshot is
  `p.docs-screenshot`.
- **Tailwind via `@apply`** in `theme.css`; plain CSS only where Tailwind does not reach. `_local/` is
  for working files that are not committed.

The N codes are the rules in [Structure](./estructura.md#numbered-rules).

## Tests

- **Strict TDD for logic:** anything that decides something (a URL, an order, a validation, a client
  state) is written test first.
- **No tests for the visual or obvious.** For CSS only **contracts** are tested: contrast ratios, that
  the two dark palettes match, that there are no literal colours, that the `@source` points at `src/`.
- Tests live next to their file and describe the behaviour in Spanish.

| Type | Where | How |
| --- | --- | --- |
| Pure core | `core/**/*.test.ts` | Data in, data out. |
| Client | `client/**/*.test.ts` | The injected environment (`Storage`, `matchMedia`, linkedom document). |
| Components | `components/**/*.test.ts` | `render()` and `text()` from `testing/render.ts`; texts with `stringsFor()`. |
| Markdown plugins | `astro/markdown/*.test.ts` | `testing/markdown.ts`. |
| Views | `astro/views/*.test.ts` | Pure functions over a resolved config; an `astro:content` double in `testing/astro-content.ts`. |
| Full build | `astro/integration/builds/` | A real `astro build` of fixtures or of cases described as data (`testing/case.ts`). These are the slow ones. |
| Listing links (N2) | `astro/views/doc-listing.test.ts`, `builds/indexes.test.ts` | Every pager and selector link is a route that exists. |
| Config types (N15) | `testing/config-types.ts` | Not executed: `npm run check` checks it, with `// @ts-expect-error` on what it must reject. |
| Repo guards | `testing/boundaries.test.ts`, `testing/package-contents.test.ts`, `components/styles/theme.test.ts`, `components/coupling.test.ts` | They fail if someone relaxes a rule. |
| Scripts | `scripts/**/*.test.ts` | Pure transformations. |

- **Inject the environment** (`BootEnv`, `LayoutEnv`, `ConsentEnv`) instead of mocking globals.
- **Validated doubles:** built with the real `docsSchema()` and plugin.
- **Aggregated errors:** check that every failure comes out with its path, not just the first.

```sh
npx vitest run src/core/navigation         # one folder
npx vitest run -t "sin editUrl"            # by name
npx vitest run --exclude '**/builds/**'    # only the fast ones
```

:::note[Mutation]{collapsed}
Mutating everything is about 12,000 mutants and takes hours; locally, narrow it with
`npx stryker run --mutate "src/core/shared/text.ts"`. Stryker stores what it measured in
`.stryker-cache/incremental.json`. In CI, the **Mutation** workflow (manual, on `main`) splits the work
into shards and stores the baseline in the cache; **Mutation incremental** runs on PRs and on every push
to `main`, reusing that baseline, and is informational. With no baseline in the cache, run the manual
one first.
:::

## Recipes

In all of them the order is the same: **test first** where there is logic, then the code, then the
documentation.

:::note[A component]{collapsed}
1. **Choose the level:** `atoms/` (an indivisible piece), `molecules/` (a few pieces with one purpose)
   or `organisms/` (an area of the page, which **only composes**: N10).
2. **Everything comes through props**, texts included (`strings` and `translate(strings, 'key')`). A
   component does not import `astro:*`, `virtual:*` or `src/astro/`: ESLint prevents it.
3. **Styles** with utilities and tokens, never literal colours; long rules go in `theme.css` with
   `@apply`.
4. **Behaviour in the browser:** an `init*` function in `src/client/`, called from `bootDocs` or, if it
   belongs to the content, from `bootArticle`. Its texts travel in `data-*` attributes.
5. **If it has logic**, its view model is a pure function in `core/<domain>/view.ts` (N1), with a test,
   and URLs reach it through a port in `astro/views/`.
6. A test in `<Component>.test.ts` if it has render logic, and its line in the
   [`src/` map](./estructura.md#the-src-map).

Components are exported on their own through `@velezanthony/design/components/*`.
:::

:::note[A configuration option]{collapsed}
1. **Its group** (N13): `site`, `i18n` or `content`; if it changes per folder, `content.folders` (N11).
   Add the field to the group's schema (it is a `strictObject`) and its test in `schema.test.ts`.
   Validations that cross groups go in the `superRefine` of `schema.ts`. Types come from the schema
   (N5).
2. **Closed values** (N12): an `as const` object, its type and its schema, exported from
   `src/astro/integration/index.ts` with its case in `public-api.test.ts`.
3. **Default value** in the group's `resolve*`, not in the schema (test in `resolve.test.ts`).
4. **Virtual module:** add the type by hand in `src/astro/virtual/virtual.d.ts`.
5. **Use:** ask only for your part with `ConfigPick`; whatever depends on the pages is validated in the
   loader.
6. **Not in the frontmatter** (N14). **Public types** (N15): its case in `src/testing/config-types.ts`.
7. **Documentation:** its row in the [options list](../guia/opciones.md) and, if it changes how it is
   used, its guide, in both languages. Try it in the playground or on this site.
:::

:::note[An interface text]{collapsed}
Add the key (stable and namespaced, `'footer.report'`) to the `en` and `es` catalogues in
`src/core/i18n/ui-strings.ts`; `ui-strings.test.ts` requires it to exist in every language. Variables
are written `{name}`. The `i18n.ui` schema is generated from the keys, so sites can already override
it.
:::

:::note[A new language]{collapsed}
Add its full catalogue to `ui-strings.ts` (and to `defaultStrings` and `localeNames`). The completeness
test will tell you what is missing.
:::

## Next step

The colours and tokens the components use: [Palette and tokens](./paleta.md).
