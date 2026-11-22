---
seo:
  title: "Migrar desde MkDocs Material"
  description: "Cómo convertir la documentación de un repo con MkDocs Material sin mover sus .md: el migrador, su modo --in-place, la config sugerida, las anclas y lo que no traduce."
---

# Migrar desde MkDocs

Al terminar esta página tendrás los `.md` de un repo con MkDocs Material convertidos a la sintaxis de
la librería, en su sitio, y una config sugerida para empezar.

La librería lee los `.md` donde ya están (con
[`content.dir`](./navegacion.md#páginas-fuera-del-proyecto-de-astro-contentdir)), así que migrar
no es mover ficheros: solo hay que convertir una vez la sintaxis propia de MkDocs Material.

> [!NOTE]
> El migrador vive en el repositorio de la librería, no en el paquete: clona `velezanthony/design`,
> ejecuta `npm install` y lánzalo desde su raíz.

## El flujo habitual

```sh
node scripts/migrate-mkdocs/cli.ts --repo <ruta al repo> --in-place --dry-run   # solo enseña el plan
node scripts/migrate-mkdocs/cli.ts --repo <ruta al repo> --in-place
git -C <ruta al repo> diff docs/   # revisa la conversión; git checkout docs/ la descarta
```

- **Qué convierte:** las cajas de aviso (`!!!`, `???`, `???+`), las pestañas (`=== "x"`), los iconos de
  Material, `attr_list` y los ids de encabezado. Los enlaces `.md` relativos se quedan tal cual. Solo
  reescribe los ficheros que cambian y respeta sus saltos de línea; ejecutarlo dos veces no cambia nada.
- **Seguridad:** se niega a correr si el repo no es git o si `docs/` tiene cambios sin confirmar
  (`--force` lo salta, pero tu diff se mezclaría con lo que tuvieras a medias).
- **Anclas:** MkDocs y la librería no generan igual los ids de los encabezados (la librería conserva
  los acentos y numera los repetidos con `-1`). El migrador reescribe cada `[x](#ancla)` al id nuevo,
  también entre ficheros.
- **Restos:** al terminar revisa el resultado y lista, con `fichero:línea`, cualquier sintaxis de
  MkDocs que quede (código de salida 1).
- **Snippets:** una página que solo contiene `--8<-- "CHANGELOG.md"` no se toca; el informe te da la
  entrada exacta de `content.external` para sustituirla y los enlaces que apuntaban a ella.
- **mkdocstrings:** con `--api <api.json>`, las directivas `::: paquete.Símbolo` se sustituyen por la
  referencia generada; sin él, quedan como una nota.

## La config sugerida

Si hay un `mkdocs.yml` en la raíz, el migrador imprime una config ya en los grupos `site`, `i18n` y
`content` (`--config-out <fichero>` la escribe):

| En `mkdocs.yml` | En la config sugerida |
| --- | --- |
| `plugins.i18n.languages` | `i18n.locales` e `i18n.defaultLocale` |
| `fallback_to_default: true` | `i18n.missing: 'fallback'` |
| `exclude_docs` | `content.exclude` |
| `nav:` | `content.nav`, con una sección con `sidebar` por grupo, en el mismo orden |
| Lo que vive fuera de `docs/` con `docs_dir: .` | `content.external` (el `README.md` de la raíz como portada) |
| `site_url` | `site` y `base` de `astro.config.mjs`, en un comentario |

Falta `site.name`, que pones a mano. Al final lista lo que no traduce (el tema de Material,
`extra_css`, `hooks`, plugins sin equivalente…): nada se pierde en silencio.

:::note[Modo carpeta (`--out`)]{collapsed}
Para migraciones que sí mueven los ficheros: `--repo`, `--out` y `--repo-url`, más opcionales
(`--branch`, `--api`, `--external`, `--sidebar-out`, `--config-out`, `--dry-run`, `--report`). Nunca
escribe en el origen. Es lo que usa el playground de este repo.
:::

## Siguiente paso

Vuelve al principio de la guía: [Tu primer sitio](./primer-sitio.md).
