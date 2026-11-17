# Design

`@velezanthony/design` es **una librería, no un sitio**. Reúne dos cosas que todos los repositorios
de [velezanthony](https://github.com/velezanthony) necesitan y que no tiene sentido rehacer en cada
uno:

1. **Un sistema de diseño**: paleta, tipografía (IBM Plex), tokens de Tailwind, tema claro/oscuro y
   componentes genéricos (átomos, moléculas, organismos).
2. **Un motor de documentación**: una integración de Astro que, a partir de una carpeta de Markdown y
   un único archivo de configuración, genera el sitio entero: rutas, barra lateral, índice,
   búsqueda, SEO, idiomas, `sitemap.xml`, `404.html` y aviso de cookies.

## El problema que resuelve

Sin la librería, cada repo con documentación arrastra su propio MkDocs, su propio CSS y sus propias
decisiones a medias. Cuando arreglas algo en uno, los demás se quedan atrás. Con la librería:

- El **aspecto y el comportamiento** viven en UN sitio. Un arreglo en la librería llega a todos los
  repos con solo subir la etiqueta que instalan.
- Cada repo consumidor **solo escribe lo suyo**: su Markdown, su `docs.config.mjs` y, si de verdad
  lo necesita, algún componente específico. Nada de layouts, CSS ni rutas.
- Las reglas estrictas (enlaces validados, títulos obligatorios, lenguajes en los bloques de código)
  son las mismas para todos, así que la calidad no depende de acordarse en cada repo.

```mermaid
flowchart LR
  lib["@velezanthony/design<br/>(este repo)"]
  lib -->|"github:velezanthony/design#vX.Y.Z"| a["repo A / docs"]
  lib -->|"github:velezanthony/design#vX.Y.Z"| b["repo B / docs"]
  lib -->|"file:.. (workspace)"| pg["playground/"]
  lib -->|"file:.. (workspace)"| ds["docs/ (este sitio)"]
  a --> pa["GitHub Pages<br/>velezanthony.github.io/A/"]
  b --> pb["GitHub Pages<br/>velezanthony.github.io/B/"]
  ds --> pd["GitHub Pages<br/>velezanthony.github.io/design/"]
```

Este mismo sitio está construido con la librería (_dogfooding_): vive en la carpeta `docs/` del repo
y la consume exactamente igual que `playground/`, enlazada como workspace de npm.

## Mapa del sitio

| Sección | Qué encontrarás |
| --- | --- |
| [Concepto](./concepto/index.md) | Dónde se monta la librería en un repo consumidor, qué pone ella y qué pone el consumidor, y por qué `playground/` y `docs/` nunca llegan a los consumidores. |
| [Integración](./integracion/index.md) | Paso a paso para un repo nuevo y, después, cómo funciona por dentro: hooks, loader, Markdown, rutas, SEO, idiomas, navegación, búsqueda, analítica y disposición. |
| [Arquitectura](./arquitectura/index.md) | Las capas de `src/`, qué puede importar cada una y cómo lo hace cumplir ESLint, el mapa de carpetas y el recorrido de una página de principio a fin. |
| [Mantenimiento](./mantenimiento/index.md) | Comandos, política de tests, paleta y tokens, recetas para añadir piezas y cómo publicar una versión. |

> [!TIP]
> Si vuelves aquí tras meses sin tocar la librería, empieza por
> [Arquitectura](./arquitectura/index.md) y después lee [Mantenimiento](./mantenimiento/index.md).
> Cada página dice en qué archivo vive cada cosa para que puedas ir directo al código.
