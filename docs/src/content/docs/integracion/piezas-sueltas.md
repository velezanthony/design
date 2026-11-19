---
order: 10
seo:
  title: "Piezas sueltas: iconos, listas, textos y cabeceras de sección"
  description: "Componentes de la librería pensados para páginas propias de un sitio: Icon, InlineList, Text y SectionHead, con sus props y su ruta de importación."
---

# Piezas sueltas para páginas propias

Además de las páginas de documentación, la librería exporta piezas pequeñas para las páginas que el
sitio escribe en `src/pages/`. Todas salen de la subruta `./components/*`, no llevan datos ni textos
propios (lo que muestran llega por props o por la ranura) y usan los tokens de `theme.css`.

## Atoms

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `Icon` | `@velezanthony/design/components/atoms/display/Icon.astro` | Iconos `mail`, `github`, `linkedin`, `external` y `arrow`; `size` (16 por defecto). `github` y `linkedin` van rellenos y el resto de trazo. |
| `InlineList` | `@velezanthony/design/components/atoms/display/InlineList.astro` | Elementos cortos (`items: string[]`) separados por un punto medio que nunca abre ni cierra una línea. |
| `Text` | `@velezanthony/design/components/atoms/display/Text.astro` | Un párrafo con `tone` (`ink`, `muted`, `faint`), `size` (`lead`, `base`, `row`, `sm`), `as` (`p`, `span`, `div`) y `measure` para limitar la línea a la medida de lectura. El contenido va en la ranura. |

`InlineList` coge el ancho del separador de `--separator` (1em por defecto; con tipografía mono,
`3ch`):

```astro
<InlineList items={['Astro', 'TypeScript', 'VS Code API']} class="[--separator:3ch] font-mono" />
```

## Molecules

| Pieza | Importación | Qué hace |
| --- | --- | --- |
| `SectionHead` | `@velezanthony/design/components/molecules/content/SectionHead.astro` | Etiqueta en mayúsculas (`eyebrow`), título opcional (`Heading`, con `level` 2 o 3 y `size` `lg` o `md`) y una acción `{ href, label }` opcional (`Link` en variante `action`). Sin `title`, la acción va en la línea de la etiqueta. |

```astro
<SectionHead eyebrow="Proyectos" title="Lo último" action={{ href: '/proyectos/', label: 'Ver todos' }} />
```
