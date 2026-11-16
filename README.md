# @velezanthony/design

A library, not a site. It holds the design system and the Astro docs integration that the
documentation of [velezanthony](https://github.com/velezanthony)'s repositories is built with,
so every repo's docs look and behave the same.

> Work in progress: nothing is exported yet.

## Requirements

- Node `>=22.23.4`
- Astro 7
- Tailwind CSS 4

## Install

It is not published to npm. Install it from GitHub, pinned to a release tag:

```sh
npm install github:velezanthony/design#v0.1.0
```

To update, change the tag and install again.

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
