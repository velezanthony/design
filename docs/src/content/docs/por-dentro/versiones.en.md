---
slug: internals/releases
seo:
  title: "Publish a release of the library"
  description: "A release is a git tag: how to publish it, which version number it gets, how to update the sites that use it and how this documentation site is deployed."
---

# Publish a release

The library is not on npm: a release is **a git tag**, and sites install it with
`github:velezanthony/design#<tag>`.

## Step by step

1. **Everything green** on `main`: `npm test`, `npm run lint`, `npm run format:check`, `npm run check`
   and `npm run docs:build` without warnings. If you have touched the structure, also look at
   `npm pack --dry-run` (see [Why only `src/` goes into the package](./index.md#why-only-src-goes-into-the-package)).
2. **Bump `version`** in the PR with `npm version <number> --no-git-tag-version`, following semver:
   _patch_ for fixes, _minor_ for new, compatible options or components, and _major_ for anything that
   forces a change in the config, the content or the imports. While the version is `0.x`, an
   incompatible change bumps the _minor_. In the same PR, write the release's section in
   `CHANGELOG.md`.
3. **Tag and publish** after the merge, on the merge commit:

   ```sh
   git checkout main && git pull
   git tag v0.2.0
   git push origin v0.2.0
   gh release create v0.2.0 --verify-tag --title v0.2.0   # paste its CHANGELOG section as notes
   ```

4. **Update each site** by changing the tag, build and review the warnings:

   ```sh
   npm install --prefix docs github:velezanthony/design#v0.2.0
   ```

> [!WARNING]
> Do not move a published tag: sites whose lockfile points at the previous commit would keep
> installing the old code. If a release goes wrong, publish the next one.

Before tagging, try it in the `playground/`, the consumer that exercises the most surface. Any change
in `src/` (except tests, fixtures, `testing/` and `pages/`) reaches the sites with the next tag.

## The documentation site

This site is not published with the tags: `.github/workflows/docs.yml` deploys it on every push to
`main` that touches `docs/**`, `src/**`, `package.json`, `package-lock.json` or the workflow itself (and
by hand with `workflow_dispatch`). As `docs/` uses `file:..`, it is built with the code of that same
commit. The build step receives `PUBLIC_GTM_ID` from the repo secret; without it, the site has no
analytics. Requirement on GitHub: **Settings → Pages → Source: GitHub Actions**.

## Next step

Back to the start of the section: [Internals](./index.md).
