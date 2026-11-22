---
slug: guide/migrate-from-mkdocs
seo:
  title: "Migrate from MkDocs Material to Astro"
  description: "Convert an MkDocs Material repo to Astro without moving its .md files: the migrator, --in-place mode, the suggested config, anchors and what it does not translate."
---

# Migrate from MkDocs

By the end of this page you will have the `.md` files of an MkDocs Material repo converted to the
library's syntax, in place, and a suggested config to start from.

The library reads the `.md` files where they already are (with
[`content.dir`](./navegacion.md#pages-outside-the-astro-project-contentdir)), so migrating is not about
moving files: you only convert the MkDocs Material syntax once.

> [!NOTE]
> The migrator lives in the library repository, not in the package: clone `velezanthony/design`, run
> `npm install` and launch it from its root.

## The usual flow

```sh
node scripts/migrate-mkdocs/cli.ts --repo <path to repo> --in-place --dry-run   # only shows the plan
node scripts/migrate-mkdocs/cli.ts --repo <path to repo> --in-place
git -C <path to repo> diff docs/   # review the conversion; git checkout docs/ discards it
```

- **What it converts:** callouts (`!!!`, `???`, `???+`), tabs (`=== "x"`), Material icons, `attr_list`
  and heading ids. Relative `.md` links stay as they are. It only rewrites the files that change and
  keeps their line endings; running it twice changes nothing.
- **Safety:** it refuses to run if the repo is not git or if `docs/` has uncommitted changes (`--force`
  skips this, but your diff would mix with whatever you had half done).
- **Anchors:** MkDocs and the library do not generate heading ids the same way (the library keeps
  accents and numbers repeats with `-1`). The migrator rewrites each `[x](#anchor)` to the new id, also
  across files.
- **Leftovers:** at the end it checks the result and lists, with `file:line`, any MkDocs syntax left
  (exit code 1).
- **Snippets:** a page that only contains `--8<-- "CHANGELOG.md"` is left alone; the report gives you
  the exact `content.external` entry to replace it and the links that pointed at it.
- **mkdocstrings:** with `--api <api.json>`, `::: package.Symbol` directives are replaced by the
  generated reference; without it, they stay as a note.

## The suggested config

If there is an `mkdocs.yml` at the root, the migrator prints a config already in the `site`, `i18n` and
`content` groups (`--config-out <file>` writes it):

| In `mkdocs.yml` | In the suggested config |
| --- | --- |
| `plugins.i18n.languages` | `i18n.locales` and `i18n.defaultLocale` |
| `fallback_to_default: true` | `i18n.missing: 'fallback'` |
| `exclude_docs` | `content.exclude` |
| `nav:` | `content.nav`, with one section with `sidebar` per group, in the same order |
| What lives outside `docs/` with `docs_dir: .` | `content.external` (the root `README.md` as home page) |
| `site_url` | `site` and `base` for `astro.config.mjs`, in a comment |

`site.name` is missing; you add it by hand. At the end it lists what it does not translate (the
Material theme, `extra_css`, `hooks`, plugins without an equivalent…): nothing is lost silently.

:::note[Folder mode (`--out`)]{collapsed}
For migrations that do move the files: `--repo`, `--out` and `--repo-url`, plus optional flags
(`--branch`, `--api`, `--external`, `--sidebar-out`, `--config-out`, `--dry-run`, `--report`). It never
writes to the source. It is what this repo's playground uses.
:::

## Next step

Back to the start of the guide: [Your first site](./primer-sitio.md).
