---
seo:
  title: "Markdown: Sätteri, Shiki, directivas y Mermaid"
  description: "Cómo extiende la librería el Markdown de Astro: los plugins en orden, admoniciones y alertas de GitHub, bloques de código, diagramas y reglas estrictas."
---

# Markdown

Astro 7 procesa Markdown con **Sätteri** (`@astrojs/markdown-satteri`), un procesador basado en
árboles mdast. La librería no trae su propio procesador: **extiende el del consumidor** en
`astro:config:setup`, igual que hace Starlight. Todo vive en `src/astro/markdown/`.

## Por qué solo Sätteri

`extendMarkdownProcessor` (`processor.ts`) comprueba con `isSatteriProcessor` que el procesador de
la config sea Sätteri y, si no lo es, rompe el build con un mensaje que dice cómo arreglarlo. No hay
degradación silenciosa: las admoniciones y las pestañas son **contenido**, y un sitio que las
pintara como texto plano sin avisar sería un sitio roto.

Si lo es, hace dos cosas sobre el objeto **en sitio** (respetando lo que el consumidor ya configuró):

1. `processor.options.features.directive = true`: activa la sintaxis `:::` de directivas.
2. Añade nuestros plugins al final de `processor.options.mdastPlugins`.

## El pipeline

```mermaid
flowchart TD
  src["Archivo .md<br/>(nativo o externo)"] --> fm["Frontmatter separado<br/>(loader/frontmatter.ts)"]
  fm --> rw["rewriteLinks<br/>core/links/rewrite.ts"]
  rw --> sat["Sätteri: parseo a mdast<br/>(con directivas)"]
  sat --> cp["Plugins del consumidor<br/>(ya estaban en la lista)"]
  cp --> ga["githubAlerts"]
  ga --> ad["admonitions"]
  ad --> tb["tabs"]
  tb --> st["scrollableTables"]
  st --> ii["inlineImages"]
  ii --> mm["mermaid"]
  mm --> cl["codeLanguages"]
  cl --> rd["restoreDirectives"]
  rd --> sh["Shiki<br/>github-light-default / github-dark-default"]
  sh --> html["HTML + headings"]
```

El orden lo fija `markdownPlugins` en `register.ts`, y no es arbitrario:

| Plugin | Archivo | Qué hace |
| --- | --- | --- |
| `githubAlerts` | `github-alerts.ts` | Convierte `> [!NOTE]` en la misma admonición que la directiva. `IMPORTANT` se pinta como `info` y `CAUTION` como `danger`. |
| `admonitions` | `admonitions.ts` | `:::tip[Título]` → `<aside class="admonition" data-kind>`; con `{collapsed}`, un `<details>`. Un contenedor con nombre desconocido rompe el build. |
| `tabs` | `tabs.ts` | `::::tabs` con `:::tab[Etiqueta]` dentro → pestañas. Sin JavaScript se ven apiladas con su etiqueta. |
| `scrollableTables` | `tables.ts` | Envuelve cada tabla en un `div.table-scroll` enfocable que se desplaza en horizontal. |
| `inlineImages` | `images.ts` | Marca con `p.docs-inline-images` el párrafo que mezcla texto e imágenes: el CSS no ve el texto, y sin la marca una imagen única entre palabras se pintaría como captura. |
| `mermaid` | `mermaid.ts` | Un bloque `mermaid` pasa a `.docs-mermaid[data-mermaid]` con el código dentro, sin Shiki. El cliente lo sustituye por el SVG; sin JavaScript se lee el código. |
| `codeLanguages` | `code-languages.ts` | Avisa de bloques con fence sin lenguaje y de lenguajes que Shiki no conoce. |
| `restoreDirectives` | `restore-directives.ts` | **El último**: devuelve a texto las directivas que nadie reclamó. |

¿Por qué `restoreDirectives` al final? Con las directivas activas, Sätteri interpreta `12:30` o
`http://x` como directivas de texto y se las traga. Este plugin recupera el trozo exacto del fuente
para todo lo que ningún plugin anterior reclamó. ¿Y por qué `mermaid` antes de `codeLanguages`?
Porque `mermaid` no es un lenguaje de Shiki, y no queremos un aviso por algo que es intencionado.

Todos los plugins se crean con `docsPlugin` (`env.ts`), que los **limita a la documentación**: solo
participan en archivos de la carpeta de contenido (`content`, `src/content/docs/` por defecto) y en los `external` declarados
(`path-filter.ts`). Cualquier otro Markdown del proyecto del consumidor queda intacto.

## Las dos sintaxis de admonición

Ambas producen exactamente el mismo HTML. Los tipos son `note`, `info`, `tip`, `warning`, `danger`
y `question`.

```md
> [!WARNING]
> Alerta de GitHub: también se ve bien en la vista de GitHub del repo.

:::tip[Título propio]
Directiva: admite título y la variante plegada.
:::

:::danger[Plegada]{collapsed}
Dentro de un `<details>`.
:::
```

Las alertas de GitHub son la opción preferida para archivos que también se leen en GitHub (el
`README`, el `CHANGELOG`); las directivas, para lo que solo vive en el sitio.

## Bloques de código

- **Shiki** resalta con `github-light-default`/`github-dark-default`, salvo que el consumidor elija sus temas.
- **Alias** (`SHIKI_LANG_ALIAS` en `code-languages.ts`): `django`/`htmldjango` → `jinja`, `pycon` →
  `python`, `env`/`.env` → `dotenv`, `terminal`/`shell-session` → `shellsession`. Los `langAlias`
  del consumidor se fusionan y, si chocan, mandan los suyos (`mergeLangAlias`).
- Cada bloque lleva una **etiqueta con el lenguaje** tal como lo escribió el autor y un botón de
  copiar (`client/content/copy-code.ts`). La etiqueta es CSS puro sobre `data-language`.
- `text`, `txt`, `plain` y `plaintext` significan «texto plano a propósito»: ni avisan ni llevan
  etiqueta.

## Imágenes

Una imagen **sola en su párrafo** (`![alt](captura.png)` en su propia línea) es una captura: bloque,
ancho de la columna con su desborde (`--img-bleed`, `--img-max`), borde y esquinas redondeadas. Las
demás conservan su tamaño natural, en línea y sin borde, con `max-width: 100%`: insignias, varias
imágenes en el mismo párrafo, una imagen dentro del texto o de un enlace y un `<img width="300">`
escrito en HTML. Un `<img align="right">` (o `left`) flota como en GitHub.

El CSS no ve el texto de un párrafo, así que `inlineImages` marca los que mezclan texto e imágenes.
Fuera de la documentación ese plugin no corre: allí una imagen que sea el único elemento entre
palabras se sigue pintando como captura.

## Diagramas

Un bloque con lenguaje `mermaid` se renderiza como diagrama en el navegador. Este mismo sitio los usa
en casi todas las páginas. El código fuente del diagrama viaja en el HTML, así que sin JavaScript
sigue siendo legible.

## Reglas estrictas

El build **falla** (con archivo y línea, todos los errores a la vez) por:

- un enlace relativo o un `#ancla` rotos;
- un sufijo de idioma que no está en `locales` (`x.fr.md`);
- una página sin `h1` ni `title`;
- una admonición desconocida (`:::foo`);
- un archivo externo ausente, o una imagen SEO o un favicon de `public/` ausentes;
- políticas de traducción en conflicto;
- un sitemap de más de 50 000 URLs.

Y **avisa** (sin romper) por: traducciones ausentes sin política declarada, una imagen OG demasiado
grande o mal proporcionada, un lenguaje que Shiki no conoce y un bloque con fence sin lenguaje.

> [!TIP]
> Trata los avisos como errores. Este sitio se construye sin ninguno; si `npm run docs:build` muestra
> un aviso, arréglalo antes de hacer commit.

## Enlaces

`rewriteLinks` (`src/core/links/rewrite.ts`) se ejecuta en el loader, **antes** del procesador:

- `./otra.md#ancla` se convierte en la URL de la página en el idioma de la página que enlaza (con el
  mismo recurso que la barra lateral si no está traducida).
- Un archivo externo se enlaza con su ruta real (`../../../../CHANGELOG.md` desde
  `src/content/docs/`), y dentro de un externo los enlaces relativos se resuelven contra su
  ubicación real. Así el mismo archivo funciona en GitHub y en el sitio. Un externo también puede
  enlazar de vuelta a una página nativa por su ruta real (`./docs/users/guia.md`).
- Una imagen relativa sin `./` (`img/captura.png`) se trata como `./img/captura.png`: Astro importa
  las imágenes como módulos y una ruta sin prefijo no la encontraría.
- Un enlace relativo a un archivo de una carpeta de `static` (`../htmlcov/index.html`) se reescribe a
  su URL publicada: `base` + `to` + el resto, con su query y su ancla. Si el `exclude` de esa entrada
  lo deja fuera, falla nombrando `static[n].exclude`. Cualquier otro archivo que no sea un `.md`
  publicado es un enlace roto; la pista dice qué funciona: un `.md`, un archivo de `static` o una
  URL absoluta con el `base`.
- Los enlaces `https://` no se validan.
- `core/links/fences.ts` evita tocar lo que hay dentro de bloques de código.
