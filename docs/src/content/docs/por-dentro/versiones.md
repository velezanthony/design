---
seo:
  title: "Publicar una versión de la librería"
  description: "Una versión es una etiqueta de git: cómo publicarla, qué número le toca, cómo actualizar los sitios que la usan y cómo se despliega este sitio."
---

# Publicar una versión

La librería no está en npm: una versión es **una etiqueta de git**, y los sitios la instalan con
`github:velezanthony/design#<etiqueta>`.

## Paso a paso

1. **Todo en verde** en `main`: `npm test`, `npm run lint`, `npm run format:check`, `npm run check` y
   `npm run docs:build` sin avisos. Si has tocado la estructura, mira también `npm pack --dry-run` (ver
   [Por qué solo `src/` entra en el paquete](./index.md#por-qué-solo-src-entra-en-el-paquete)).
2. **Sube `version`** en el PR con `npm version <número> --no-git-tag-version`, siguiendo semver:
   _patch_ para arreglos, _minor_ para opciones o componentes nuevos y compatibles, y _major_ para lo
   que obliga a cambiar la config, el contenido o los imports. Mientras la versión sea `0.x`, un cambio
   incompatible sube el _minor_. En el mismo PR, escribe la sección de la versión en `CHANGELOG.md`.
3. **Etiqueta y publica** tras el merge, sobre el commit del merge:

   ```sh
   git checkout main && git pull
   git tag v0.2.0
   git push origin v0.2.0
   gh release create v0.2.0 --verify-tag --title v0.2.0   # pega como notas su sección del CHANGELOG
   ```

4. **Actualiza cada sitio** cambiando la etiqueta, construye y revisa los avisos:

   ```sh
   npm install --prefix docs github:velezanthony/design#v0.2.0
   ```

> [!WARNING]
> No muevas una etiqueta publicada: los sitios con el lockfile apuntando al commit anterior seguirían
> instalando lo viejo. Si una versión sale mal, publica la siguiente.

Antes de etiquetar, pruébala en el `playground/`, el consumidor que más superficie ejercita. Cualquier
cambio en `src/` (salvo tests, fixtures, `testing/` y `pages/`) llega a los sitios en la siguiente
etiqueta.

## El sitio de documentación

Este sitio no se publica con las etiquetas: lo despliega `.github/workflows/docs.yml` en cada push a
`main` que toque `docs/**`, `src/**`, `package.json`, `package-lock.json` o el propio workflow (y a mano
con `workflow_dispatch`). Como `docs/` usa `file:..`, se construye con el código de ese mismo commit.
El paso de build recibe `PUBLIC_GTM_ID` del secreto del repo; sin él, el sitio sale sin analítica.
Requisito en GitHub: **Settings → Pages → Source: GitHub Actions**.

## Siguiente paso

Vuelve al principio de la sección: [Por dentro](./index.md).
