---
slug: internals/fork
seo:
  title: "Fork the library and maintain your own copy"
  description: "What to change to maintain your own copy: the author's personal details, the package name, the site URLs, and how to publish your own releases as git tags."
---

# Fork the library

By the end of this page you will have your own copy of the library, without my personal details, with
your own package name and publishing your own releases.

## 1. Remove my personal details

| Where | What to change |
| --- | --- |
| `src/core/author.ts` | `AUTHOR` (`name`, `shortName`, `email`, `url`): the default footer signature. |
| `src/astro/integration/define-docs-site.ts` | `DEFAULT_SITE`, the default origin of `defineDocsSite`. |
| `src/components/organisms/chrome/DocsFooter.astro` | The comment with the signature example. |
| `package.json` | The package name and scope (`@velezanthony/design`). |
| `docs/docs.config.mjs` | `site.social`, `site.analytics.privacyUrl`, the `content.nav` links and `content.editUrl`. |
| `.github/workflows/docs.yml` | The comment with the published site URL. |
| `playground/` and `scripts/playground-snapshot/refresh.sh` | The test content and the project URLs the playground uses. |
| The guides and `README.md` | The install commands (`github:velezanthony/design#v0.2.0`) and the example URLs. |

The footer and `<head>` tests check the default signature: if you change `AUTHOR`, update them too
(`npm test` will tell you which).

## 2. Check that everything is still green

```sh
npm install
npm test && npm run lint && npm run format:check && npm run check
npm run docs:build
```

## 3. Publish your releases

A release is a git tag in your repo, and your sites install it with
`npm install github:<your-user>/<your-repo>#v0.2.0`. The full process is in
[Publish a release](./versiones.md).

## Next step

How `src/` is split and what each part may import: [Structure](./estructura.md).
