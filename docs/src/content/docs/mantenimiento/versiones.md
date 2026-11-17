---
order: 5
---

# Publicar una versión

La librería no está en el registro de npm. Una «versión» es **una etiqueta de git** en este repo, y
los consumidores la instalan con `github:velezanthony/design#<etiqueta>`.

```mermaid
sequenceDiagram
  participant Y as Tú (repo design)
  participant GH as GitHub
  participant C as Repo consumidor
  Y->>Y: npm test · lint · format:check · check · docs:build
  Y->>Y: sube "version" en package.json (0.2.0)
  Y->>GH: commit en main + git tag v0.2.0 + push de la etiqueta
  C->>C: npm install github:velezanthony/design#v0.2.0
  C->>C: npm run build (y revisa avisos)
  C->>GH: commit del package.json y package-lock.json
  GH-->>C: su workflow redespliega sus docs
```

## Paso a paso

1. **Comprueba que todo está verde** en `main`: `npm test`, `npm run lint`, `npm run format:check`,
   `npm run check` y `npm run docs:build` sin avisos. Mira también `npm pack --dry-run` si has
   tocado algo de la estructura (ver [Por qué no entra en el paquete](../concepto/fuera-del-paquete.md)).
2. **Sube `version`** en el `package.json` de la raíz siguiendo semver:
   - _patch_ (`0.1.1`): arreglos sin cambios visibles en la config.
   - _minor_ (`0.2.0`): opciones o componentes nuevos, compatibles.
   - _major_ (`1.0.0`): algo que obliga a los consumidores a cambiar su config, su contenido o sus
     imports (una opción renombrada, una regla estricta nueva que puede romper builds, un archivo
     movido de una subruta de `"exports"`).

   Mientras la versión sea `0.x`, un cambio incompatible sube el _minor_.
3. **Commit, etiqueta y push**:

   ```sh
   git commit -am "chore: release v0.2.0"
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

4. **Actualiza cada consumidor** cambiando la etiqueta:

   ```sh
   npm install --prefix docs github:velezanthony/design#v0.2.0
   ```

   El `package-lock.json` fija el commit exacto de la etiqueta, así que un consumidor nunca recibe
   cambios que no ha pedido. Construye, revisa avisos y haz commit.

> [!WARNING]
> No muevas una etiqueta ya publicada. Un consumidor con el lockfile apuntando al commit anterior
> seguiría instalando lo viejo, y uno sin lockfile recibiría algo distinto con la misma versión. Si
> una versión sale mal, publica la siguiente.

## Qué ve el consumidor de cada cambio

Como el paquete es fuente sin compilar, **cualquier** cambio en `src/` (excepto tests, fixtures,
`testing/` y `pages/`) llega al consumidor en la siguiente etiqueta. Antes de publicar, pregúntate:

- ¿He cambiado el esquema? Una opción más estricta puede romper configs que antes pasaban.
- ¿He añadido una regla estricta? Un contenido que antes construía puede fallar ahora.
- ¿He cambiado un texto de interfaz? Si el consumidor lo sobrescribía, sigue viendo el suyo; si no,
  verá el nuevo.
- ¿He movido un archivo bajo una subruta de `"exports"`? Es un cambio incompatible.

Prueba la versión en el `playground/` (dos idiomas, externos, API generada) antes de etiquetar: es el
consumidor que más superficie ejercita.

## El sitio de documentación

Este sitio **no** se publica con las etiquetas, sino con cada push a `main` que toque algo que le
afecte. `.github/workflows/docs.yml`:

- Se dispara con push a `main` si cambian `docs/**`, `src/**`, `package.json`, `package-lock.json` o
  el propio workflow; y a mano con `workflow_dispatch`.
- Permisos `contents: read`, `pages: write`, `id-token: write` (este último porque `deploy-pages` se
  autentica con un token OIDC).
- `concurrency: pages` sin cancelar: un despliegue nunca se interrumpe a medias.
- Job `build`: checkout, Node 24 con caché de npm, `configure-pages`, `npm ci` en la raíz (instala
  el workspace `docs/` enlazado a `src/`), `npm run docs:build` y `upload-pages-artifact` con
  `docs/dist`.
- Job `deploy`: `deploy-pages` en el entorno `github-pages`.

Como `docs/` usa `file:..`, el sitio siempre documenta y se construye con **el código de ese mismo
commit**, no con una etiqueta. Requisito único en GitHub: **Settings → Pages → Source: GitHub
Actions**.
