---
seo:
  title: "Hacer un fork de la librería"
  description: "Qué cambiar para mantener tu propia copia: los datos personales del autor, el nombre del paquete, las URLs del sitio y cómo publicar tus propias versiones."
---

# Hacer un fork

Al terminar esta página tendrás tu propia copia de la librería, sin mis datos personales, con tu
nombre de paquete y publicando tus propias versiones.

## 1. Quita mis datos personales

| Dónde | Qué cambiar |
| --- | --- |
| `src/core/author.ts` | `AUTHOR` (`name`, `shortName`, `email`, `url`): la firma por defecto del pie. |
| `src/astro/integration/define-docs-site.ts` | `DEFAULT_SITE`, el origen por defecto de `defineDocsSite`. |
| `src/components/organisms/chrome/DocsFooter.astro` | El comentario con el ejemplo de la firma. |
| `package.json` | El nombre y el ámbito del paquete (`@velezanthony/design`). |
| `docs/docs.config.mjs` | `site.social`, `site.analytics.privacyUrl`, los enlaces de `content.nav` y `content.editUrl`. |
| `.github/workflows/docs.yml` | El comentario con la URL publicada del sitio. |
| `playground/` y `scripts/playground-snapshot/refresh.sh` | El contenido de prueba y las URLs del proyecto que usa el playground. |
| Las guías y el `README.md` | Las órdenes de instalación (`github:velezanthony/design#v0.2.0`) y las URLs de ejemplo. |

Los tests del pie y del `<head>` comprueban la firma por defecto: si cambias `AUTHOR`, actualízalos
también (`npm test` te dirá cuáles).

## 2. Comprueba que todo sigue en verde

```sh
npm install
npm test && npm run lint && npm run format:check && npm run check
npm run docs:build
```

## 3. Publica tus versiones

Una versión es una etiqueta de git en tu repo, y tus sitios la instalan con
`npm install github:<tu-usuario>/<tu-repo>#v0.2.0`. El proceso completo está en
[Publicar una versión](./versiones.md).

## Siguiente paso

Cómo se reparte `src/` y qué puede importar cada parte: [Estructura](./estructura.md).
