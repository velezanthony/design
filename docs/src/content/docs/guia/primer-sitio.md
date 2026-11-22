---
seo:
  title: "Tu primer sitio de documentación"
  description: "Paso a paso para documentar un proyecto: crear el subproyecto de Astro, instalar la librería, escribir los tres archivos de configuración, añadir páginas y desplegar en GitHub Pages."
---

# Tu primer sitio

Al terminar esta página tendrás un sitio de documentación publicado en GitHub Pages, con búsqueda,
tema claro y oscuro y barra lateral. Necesitas Node `>=22.23.4` y un repositorio en GitHub; los
ejemplos ponen el sitio en una carpeta `docs/` dentro del repo.

## 1. Crear el subproyecto e instalar

```sh
npm create astro@latest docs -- --template minimal --no-git
npm install --prefix docs github:velezanthony/design#v0.2.0
npm install --prefix docs astro @astrojs/markdown-satteri
```

Borra `docs/src/pages/index.astro`: tu portada será un `index.md`.

:::note[Por qué se instala así]{collapsed}
- La librería no está en npm: se instala desde GitHub, **fijada a una etiqueta**. Para actualizar,
  cambia la etiqueta y vuelve a instalar.
- `astro` y `@astrojs/markdown-satteri` son obligatorias porque la librería se distribuye como código
  fuente y la compila tu Astro. Tailwind llega con la librería.
- Para comprobar tipos con `astro check`, añade `npm install --prefix docs -D @astrojs/check typescript`.
- Los `favicon.svg` y `favicon.ico` del scaffold no se usan salvo que apuntes `site.favicon` a ellos.
:::

## 2. Los tres archivos

::::tabs
:::tab[docs.config.mjs]
```js
// docs/docs.config.mjs: la configuración, una sola vez
import { defineDocsConfig } from '@velezanthony/design/integration';

export default defineDocsConfig({
  site: { name: 'Mi proyecto' },
  i18n: { locales: ['es'] },
});
```
:::
:::tab[astro.config.mjs]
```js
// docs/astro.config.mjs
import { defineDocsSite } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, { base: '/mi-proyecto', site: 'https://usuario.github.io' });
```
:::
:::tab[content.config.ts]
```ts
// docs/src/content.config.ts
export { collections } from '@velezanthony/design/content';
```
:::
::::

- **`base`** es obligatoria: GitHub Pages sirve un proyecto bajo `https://<usuario>.github.io/<repo>/`,
  así que es `'/<repo>'` (o `'/'` en un sitio de usuario u organización). **`site`** es tu origen.
- La librería pone Tailwind, el tema, las fuentes, las rutas y la búsqueda: no escribes ningún layout
  ni ningún import de CSS.

## 3. Contenido

```text
docs/src/content/docs/
├── index.md          → /mi-proyecto/            (portada)
└── guia/
    ├── index.md      → /mi-proyecto/guia/
    └── instalar.md   → /mi-proyecto/guia/instalar/
```

- **El título** es el primer `# h1` (o el `title` del frontmatter). Sin ninguno, el build falla.
- **Los enlaces** entre páginas son rutas `.md` relativas (`./instalar.md#requisitos`): funcionan en
  GitHub y la librería los convierte en URLs del sitio, validando el archivo y el ancla.
- **Un `README.md`** hace de `index.md` de su carpeta si esta no tiene uno, como en MkDocs. La portada
  es opcional: sin `index.md` ni `README.md`, pones la tuya en `src/pages/index.astro`.

Pruébalo en local con `npm run dev --prefix docs`.

## 4. Lo básico de la configuración

La config tiene tres grupos y solo `site.name` es obligatorio. El editor autocompleta cada opción y una
clave mal escrita rompe el build con su ruta.

```js
import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

export default defineDocsConfig({
  site: { name: 'Mi proyecto', social: { github: 'https://github.com/usuario/mi-proyecto' } }, // aspecto
  i18n: { locales: ['es', 'en'] }, // idiomas y textos
  content: {
    // qué páginas hay y cómo se navega
    nav: [
      { label: 'Tutoriales', dir: 'tutoriales' }, // una sección con su barra lateral
      { label: 'Changelog', slug: 'changelog' }, // una sola página
      { label: 'GitHub', href: 'https://github.com/usuario/mi-proyecto', icon: NavIcon.GITHUB },
    ],
    external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
    editUrl: 'https://github.com/usuario/mi-proyecto/edit/main',
  },
});
```

Un texto puede ser una cadena o uno por idioma (`{ es: 'Tutoriales', en: 'Tutorials' }`). Las opciones
de valores cerrados son constantes (`NavIcon.GITHUB`), aunque las cadenas también valen.

## 5. Desplegar en GitHub Pages

En el repo, **Settings → Pages → Source: GitHub Actions**, y añade el workflow
`.github/workflows/docs.yml`: construye `docs/` con `npm ci && npm run build` y publica `docs/dist`.

:::tip[El workflow completo]{collapsed}
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

- `PUBLIC_GTM_ID` es opcional; con él, la config necesita `site.analytics.privacyUrl` (ver
  [Analítica y privacidad](./idiomas-seo-y-analitica.md#analítica-y-privacidad)).
- Para que el sitemap y los listados tengan fechas, añade `fetch-depth: 0` a `actions/checkout`.
:::note[Casos especiales]{collapsed}
- Si el proyecto de Astro es la raíz del repo, quita el prefijo `docs/` (y `../CHANGELOG.md` se
  escribe `./CHANGELOG.md`). Si tus páginas ya viven en otra carpeta, no las muevas: ver
  [Páginas fuera del proyecto](./navegacion.md#páginas-fuera-del-proyecto-de-astro-contentdir).
- Una página tuya en `src/pages/` con la misma ruta que una de la librería (`/`, `/sitemap.xml`) la
  sustituye, y al arrancar se avisa. La 404, `robots.txt` y la política de privacidad son de tu sitio.
:::

## Siguiente paso

Escribe tus páginas: [Escribir páginas](./escribir-paginas.md).
