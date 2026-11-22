---
seo:
  title: "Navegación e índices: cabecera, barra lateral y listados"
  description: "Cómo organizar la cabecera y la barra lateral, generar los índices de carpeta y publicar archivos externos, carpetas estáticas y páginas de fuera del proyecto."
---

# Navegación e índices

Al terminar esta página tendrás la cabecera y la barra lateral en el orden que quieras, páginas que
listan solas su carpeta y los archivos de fuera de la carpeta de contenido publicados.

## Cabecera y barra lateral

### La cabecera (`content.nav`)

```js
import { NavIcon } from '@velezanthony/design/integration';

content: {
  nav: [
    { label: 'Tutoriales', dir: 'tutoriales' }, // sección: todo lo que cuelga de tutoriales/
    { label: 'Guía', dir: 'guia', sidebar: ['guia/instalar', 'guia/configurar'] }, // con orden propio
    { label: 'Referencia', sidebar: ['REFERENCE', 'changelog'] }, // sección sin carpeta común
    { label: 'Changelog', slug: 'changelog' }, // una sola página
    { label: 'GitHub', href: 'https://github.com/o/r', icon: NavIcon.GITHUB }, // enlace externo
  ],
},
```

| Elemento | Forma | Qué hace |
| --- | --- | --- |
| Sección | `{ label, dir?, sidebar? }` | Le pertenecen las páginas de `dir` y las que nombra su `sidebar`, vivan donde vivan. Tiene su propia barra lateral y «anterior / siguiente» no salen de ella. Enlaza a la página índice de `dir` o, si no hay, a su primera página. |
| Página | `{ label, slug }` | Enlace a una sola página, que no es de ninguna sección. |
| Enlace | `{ label, href, icon? }` | Externo, solo `https://`. Con `icon` solo se ve el icono. |

- **Orden de una sección:** su `sidebar`, y lo que no nombra va después por `order` del frontmatter y
  luego por slug. **Sin `sidebar`, es alfabético por slug.**
- **Las páginas fuera de toda sección** (la portada) usan la `sidebar` general o, sin ella, una lista
  automática de solo esas páginas.
- Sin `nav`, hay una sola barra lateral para todo el sitio. Desde `lg` los elementos van en la cabecera;
  por debajo, en el menú móvil.
- Un elemento de página sin traducir sigue `i18n.missing` (`omit` lo oculta).

### La barra lateral (`content.sidebar`)

```js
content: {
  sidebar: ['index', { label: 'Primeros pasos', items: ['guia/instalar', 'guia/configurar'] }, 'changelog'],
},
```

- Las entradas son slugs o grupos `{ label, slug?, items }`. La portada es `'index'`, y
  `carpeta/index.md` se escribe `'carpeta'`.
- Lo que no declaras va **después**, agrupado por carpetas (un grupo por carpeta, con el título de su
  `index.md` si lo tiene) y ordenado por `order` y slug.
- Declarar la página de una carpeta (`'articulos'`) coloca ahí el grupo entero de esa carpeta.
- Una etiqueta de grupo enlaza a la página de su carpeta si existe.

:::note[Qué carpeta enlaza un grupo escrito a mano]{collapsed}
Un grupo escrito a mano enlaza la página de su carpeta (generada, `_index.md` o `index.md`) cuando sus
páginas comparten esa carpeta y ningún grupo interior la reclama; un grupo que solo envuelve a otro
sube a la carpeta de encima. Un `slug` escrito a mano manda.
:::

### Limitar la profundidad del árbol (`tree.depth`)

Sin límite, el árbol automático tiene un grupo por carpeta a cualquier profundidad. `tree.depth`, en
[`content.folders`](#ajustes-por-carpeta-contentfolders), lo recorta contando
desde la carpeta que lo declara:

```js
import { ALL_FOLDERS } from '@velezanthony/design/integration';

content: {
  folders: {
    [ALL_FOLDERS]: { tree: { depth: 3 } }, // todo el sitio: tres niveles desde la raíz de cada árbol
    'articulos/sistemas': { tree: { depth: 2 } }, // dos niveles desde esta carpeta
  },
},
```

**Nada se oculta:** lo más hondo va plano en el último grupo permitido. Gana la carpeta declarada más
cercana, luego `'*'`, y solo afecta a los grupos automáticos, no a los escritos en `sidebar`.

### Mostrar el árbol completo de una carpeta (`tree.show`)

```js
import { TreeShow } from '@velezanthony/design/integration';

content: { folders: { articulos: { tree: { show: TreeShow.ALL } } } }, // SECTION (por defecto) | ALL
```

Con `ALL`, todas las páginas de la carpeta muestran su árbol completo: la página de la carpeta arriba,
cada sección de `nav` que tiene páginas dentro como grupo y, al final, las páginas sin sección.
«Anterior / siguiente» recorren ese árbol entero, saltando de una sección a otra.

:::tip[Si vienes de MkDocs]{collapsed}
Sin `sidebar`, las páginas no salen en el orden del `nav:` de MkDocs. Escribe el `sidebar` de cada
sección con las mismas páginas en el mismo orden; el [migrador](./migrar-desde-mkdocs.md) lo genera.
:::

### La búsqueda

Funciona sin configurar nada: es **Pagefind**, un índice estático por idioma que se genera al final de
`astro build`. Indexa solo el contenido de las páginas indexables (ni la cabecera, ni el pie, ni las
páginas `noindex`, de paginación o de reserva). La tecla `/` enfoca el buscador.

En desarrollo **no hay búsqueda**, porque el índice no existe hasta terminar un build. Para probarla:

```sh
npm run build && npm run preview
```

:::warning[Qué rompe el build]{collapsed}
Todos los fallos salen a la vez, con la ruta de la clave (`content.nav[1].dir`): un `dir` sin páginas,
dos `dir` que se solapan, un slug que no es ninguna página, una página que sería de dos secciones y un
`href` que no es `https://`.
:::

## Índices de carpeta

### Generar el índice

::::tabs
:::tab[docs.config.mjs]
```js
import { ListingView } from '@velezanthony/design/integration';

content: {
  folders: {
    tutoriales: { listing: { generate: true, view: ListingView.CARDS } },
  },
},
```
:::
:::tab[_index.md]
```md
<!-- tutoriales/_index.md (opcional): solo los textos -->
---
seo:
  description: "Tutoriales paso a paso, agrupados por nivel."
---

# Tutoriales

Tutoriales paso a paso, desde la instalación hasta el despliegue.
```
:::
::::

`/tutoriales/` pinta el cuerpo del `_index.md` y, debajo, el listado. Si hay índice lo decide la
config; el `_index.md` solo pone los textos.

- El `_index.md` no tiene ruta propia: su página es la de la carpeta (`sidebar: ['tutoriales']` la
  enlaza). Se traduce como cualquier página (`_index.en.md`).
- `generate` se hereda: las subcarpetas también reciben su página.
- Sin `_index.md`, la página lleva el título de la sección o del grupo de esa carpeta (o el nombre de la
  carpeta) y la descripción «Todas las páginas de {title}.».
- Las páginas de carpeta entran en el sitemap y en la búsqueda; `seo.noindex: true` en su `_index.md`
  las saca. No salen como hoja en la barra lateral: las enlaza el grupo de su carpeta.

| En la carpeta | `generate` encendido | `generate` apagado (por defecto) |
| --- | --- | --- |
| `index.md` | Gana esa página (el build lo informa) | Esa página |
| `_index.md` | El índice, con sus textos | **Error de build** con la pista de la clave |
| Ninguno | El índice: título y listado | Nada |

### Cómo se ve

Lista las páginas de la carpeta y sus subcarpetas en el orden de la barra lateral, con su título, su
resumen (`index.summary` o `seo.description`), su camino y la fecha de su último commit.

::::tabs
:::tab[Lista]
`view: ListingView.LIST` (por defecto): el árbol, con un `##` por sección. Sin paginar.
:::
:::tab[Tabla]
`view: ListingView.TABLE`: título, resumen, sección y fecha, de lo más reciente a lo más antiguo.
Pagina de 10 en 10.
:::
:::tab[Tarjetas]
`view: ListingView.CARDS`: tarjetas con portada 16:9, camino, título, resumen y fecha. Pagina de 12
en 12.
:::
::::

:::note[Paginación, nombres reservados y fechas]{collapsed}
- **Paginación** (tabla y tarjetas): `/tutoriales/page/2/`… Debajo, un selector «Por página» lleva a
  cada tamaño, que es otra ruta estática (`/tutoriales/per-page/24/`). Solo la página 1 del tamaño por
  defecto es indexable.
- **Nombres reservados:** dentro de una carpeta con listado, `page` y `per-page` son de la paginación;
  una página con esa URL rompe el build.
- **Fechas:** una página sin commit va primero y sin fecha. Sin git o en un clon superficial no hay
  fechas y el orden es el del árbol.
:::

### Portadas

```yaml
index:
  summary: "Resumen para el listado." # sin él, seo.description
  image: ./portada.png # relativa al .md o de public/ (/portadas/x.png) | false
  imageAlt: "Lo que muestra la imagen" # sin él, es decorativa
```

Precedencia: `index.image` de la página → `listing.covers` → la portada de la librería, un dibujo hecho
con los tokens del tema. Una imagen que no existe avisa y deja la de la librería. Con la
[forma explícita del loader](./opciones.md#forma-explícita-del-loader), las portadas
relativas necesitan `schema: ({ image }) => docsSchema(image)`.

### Ajustes por carpeta (`content.folders`)

Cada clave es una carpeta del contenido sin barras (`articulos/python`) o `'*'` (`ALL_FOLDERS`) para
todo el sitio. Cada ajuste se hereda **por separado** de la carpeta declarada más cercana, luego de
`'*'` y luego del valor por defecto.

```js
import { ALL_FOLDERS, ListingView, TreeShow } from '@velezanthony/design/integration';

content: {
  folders: {
    [ALL_FOLDERS]: { listing: { view: ListingView.LIST } },
    articulos: {
      listing: { generate: true, view: ListingView.CARDS, pageSize: 12, perPageOptions: [12, 24, 48], covers: true },
      tree: { show: TreeShow.ALL, depth: 3 },
    },
    'articulos/borradores': { listing: { generate: false } }, // apaga una rama
  },
},
```

Una clave que no es `'*'` ni una carpeta con páginas rompe el build con su ruta. Los valores por defecto
de cada ajuste están en la [referencia](./opciones.md#contentfolders).

### El árbol de secciones en una página (`::nav-tree`)

En una página escrita a mano, `::nav-tree` sola en su línea pinta por cada sección de `nav` un `##` con
su etiqueta y su árbol, con el título y la `seo.description` de cada página:

```md
::nav-tree{section="Avanzado" descriptions="false"}
```

`section` deja una sola sección (por su etiqueta o su `dir`) y `descriptions="false"` quita las
descripciones. Una sección que no existe o un atributo desconocido rompen el build con archivo y línea.

## Archivos externos y estáticos

| Quieres… | Opción |
| --- | --- |
| Publicar el `CHANGELOG.md` o el `README.md` de la raíz como páginas | `content.external` |
| Servir una carpeta tal cual (un informe de cobertura HTML) | `content.static` |
| Que algunos `.md` no se publiquen | `content.exclude` |
| Leer las páginas de una carpeta fuera del proyecto de Astro | `content.dir` |

### Archivos externos (`content.external`)

```js
content: { external: [{ slug: 'changelog', file: '../CHANGELOG.md' }] },
```

- `file` es un `.md` relativo al proyecto de Astro. `CHANGELOG.es.md` es su traducción.
- Sus enlaces relativos se resuelven contra su ubicación real, así que GitHub y el sitio leen la misma
  fuente. Desde una página nativa se enlaza con su ruta real (`../../../../CHANGELOG.md`).
- No tiene frontmatter: su `seo` y su `translations` van en la entrada.
- Con `slug: 'index'` es la portada (el `README.md` de la raíz, por ejemplo); si además hay un
  `index.md`, el build falla nombrando los dos.

### Carpetas estáticas (`content.static`)

```js
content: { static: [{ from: '../htmlcov', to: 'coverage', exclude: ['*.py'] }] }, // → <base>/coverage/
```

- Se publica sin Markdown ni optimizar, fuera de la búsqueda y del sitemap. `from` debe existir al
  construir; `to` no puede ser `_astro`, `pagefind` ni un idioma.
- Enlázala con una ruta relativa a su archivo (`[Cobertura](../htmlcov/index.html)`): se reescribe a la
  URL publicada.
- `exclude` deja fuera archivos con las reglas de `content.exclude`, relativas a `from`.

### Excluir archivos (`content.exclude`)

```js
content: { exclude: ['drafts/', '*.borrador.md', '/notas.md', '!drafts/listo.md'] },
```

Siguen las reglas de `.gitignore`, relativas a la carpeta de contenido: un nombre sin `/` vale a
cualquier profundidad, `/` al final es una carpeta, `**` cruza carpetas y `!` vuelve a incluir. El
sufijo de idioma cuenta (`*.es.md`). Lo excluido no se lee ni se publica, y un enlace a ello rompe el
build nombrando `content.exclude`. Los `external` no se ven afectados.

### Páginas fuera del proyecto de Astro (`content.dir`)

Si el repo ya guarda sus docs como `.md` sueltos (los de un MkDocs, por ejemplo), no los muevas: pon el
proyecto de Astro en su propia carpeta y apunta `content.dir` a la de siempre.

::::tabs
:::tab[Estructura]
```text
repo/
├── docs/            # las páginas, tal cual
├── CHANGELOG.md
└── docs-site/       # proyecto de Astro
```
:::
:::tab[docs-site/docs.config.mjs]
```js
// docs-site/docs.config.mjs
content: {
  dir: '../docs', // relativa a la raíz del proyecto de Astro
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
  repoRoot: '..',
},
```
:::
::::

Todo se resuelve contra la ubicación real de cada archivo (enlaces, anclas, imágenes, «Editar esta
página»), y `astro dev` vigila la carpeta.

:::note[Detalles de `content.dir`]{collapsed}
- No llames `site/` al proyecto de Astro: es donde MkDocs escribe su salida.
- Se rechazan las URLs y las rutas absolutas. Una carpeta elegida que no existe rompe el build; la de
  por defecto (`src/content/docs`) es opcional.
- Una imagen sin `./` (`img/x.png`) se trata como `./img/x.png`.
:::

## Siguiente paso

Publica en varios idiomas, ajusta el SEO y añade analítica: [Idiomas, SEO y analítica](./idiomas-seo-y-analitica.md).
