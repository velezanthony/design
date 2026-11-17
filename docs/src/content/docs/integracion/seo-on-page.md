---
order: 8
seo:
  title: "SEO on page: el panel de desarrollo"
  description: "Un panel que solo existe con astro dev: resumen de problemas SEO, tabla filtrable de páginas e inspector con vista previa de buscador y Open Graph, calculado con los mismos datos con que se genera el sitio."
---

# SEO on page (solo en desarrollo)

Con `astro dev` el sitio tiene tres páginas extra, bajo `base`, para revisar el SEO de cada página
**mientras escribes**: qué `<title>` y qué descripción se van a publicar, de dónde salen, cómo se verán
en un buscador y en una tarjeta al compartir, y qué problemas tienen.

| Ruta | Qué enseña |
| --- | --- |
| `/seo-on-page/` | Totales, con las páginas separadas en con problemas (error o aviso), solo informativas y sin nada, y las incidencias por gravedad y por tipo, cada una con un enlace a la tabla ya filtrada. |
| `/seo-on-page/pages` | Una fila por página **e idioma**: slug, `<title>` final con su longitud contra el límite («72 / 60»), origen y longitud de la descripción e insignias de problemas. |
| `/seo-on-page/page?slug=…&locale=…` | El inspector de una página (la portada tiene slug vacío): lo que se publica, vista previa del resultado de búsqueda y de la tarjeta Open Graph, canonical, `noindex`, el esquema de encabezados con los saltos marcados, sus problemas y sus traducciones lado a lado. |

> [!NOTE]
> Con `trailingSlash: 'always'` Astro solo
> sirve `/seo-on-page/pages/` con la barra final. Los enlaces del panel ya la llevan.

## Solo en desarrollo

La integración inyecta estas rutas únicamente cuando el comando de Astro es `dev`. Con `astro build`
**no se inyecta nada**: el panel no genera ficheros en `dist/` ni deja una sola referencia en él. Lo
comprueban dos tests: uno unitario (`integration.test.ts`: con `build` no hay rutas, con `dev` sí) y
otro sobre una build real (`builds/basic.test.ts`: `dist/` no contiene ninguna ruta `seo-on-page` ni
texto que la mencione). Las tres pantallas llevan `<meta name="robots" content="noindex">`.

Por lo mismo, en dev una página tuya en esas rutas (`src/pages/seo-on-page/…`) se detecta como
cualquier otra colisión con una ruta de la librería y rompe el arranque con un mensaje que dice qué
fichero borrar.

## Los mismos datos que el sitio

No hay rastreo ni lectura de HTML. La librería ya sabe cómo genera cada página, así que el panel
reutiliza esas mismas funciones: la cascada de metadatos (`resolveMeta`), el sufijo del título
(`composeTitle`), las URLs y la disponibilidad por idioma (`buildAvailability`) y las políticas de
traducción. Lo que enseña es, por construcción, lo que sale en el `<head>`.

```mermaid
flowchart LR
  col["Colección docs<br/>datos + encabezados"] --> ad["Adaptador<br/>astro/seo-on-page"]
  cfg["Config del sitio<br/>módulo virtual"] --> ad
  ad --> tree["buildSeoTree<br/>(núcleo, puro)"]
  tree --> an["Analizadores<br/>título · descripción · H1 · idiomas"]
  an --> ui["Rutas de dev + UI<br/>solo pintan el árbol"]
```

El adaptador (`src/astro/seo-on-page/adapter.ts`) es el único sitio que conoce `astro:content`; el
resto está en capas que no dependen de Astro (`core/seo-on-page/`, `ui/seo-on-page/`).

## Los límites

Se miden en caracteres del texto final y son orientativos (los buscadores recortan por píxeles y
cambian de criterio): `<title>` de 15 a 60, descripción de 70 a 160 y exactamente un H1. Viven todos
en `src/core/seo-on-page/thresholds.ts`. Los problemas que detecta: título largo o corto, descripción
ausente, heredada del sitio, larga o corta, título o descripción duplicados, ningún H1 o varios,
saltos de nivel (H2 → H4) y traducciones ausentes o con políticas en conflicto.

## Filtros en la URL

La tabla se filtra con un formulario `GET` (gravedad, idioma, tipo de problema y texto) sin
JavaScript: los filtros viajan en la query (`?severity=error&locale=es&kind=no-h1&q=orm`), así que
atrás/adelante y compartir el enlace funcionan.

### Qué enseña la tabla sin filtros

Casi todas las páginas tienen la incidencia informativa «descripción heredada del sitio», y mostrarlas
todas ahogaría los avisos reales. Por eso, si la URL no nombra ninguna gravedad ni ningún tipo, la
tabla parte de **errores y avisos** y lo dice en una nota con un enlace para mostrar también lo
informativo. La regla es una sola y no depende del estado:

- Lo que la URL escribe manda: `?severity=info` o `?kind=description-inherited` se ven tal cual.
- «Mostrar todo» es la URL explícita con las tres gravedades
  (`?severity=error&severity=warning&severity=info`); pedirlas a la vez equivale a no filtrar por
  gravedad, así que solo ahí aparecen también las páginas sin ninguna incidencia.
- Las casillas del formulario reflejan los filtros efectivos, de modo que enviarlo reenvía lo que se ve.
