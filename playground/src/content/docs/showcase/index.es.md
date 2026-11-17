# Escaparate

Una página que solo existe en el playground, para probar lo que las docs de snake-orm no usan:
imágenes que se abren en grande y un admonition plegado. Las capturas son de las docs de
django-cotton-gallery.

## Imágenes

Pulsa cualquier captura (o enfócala y pulsa Intro) para abrirla. Escape, el botón de cerrar o un
clic fuera la devuelven a su sitio.

![El índice de la galería: cada componente con su vista previa](./screenshot-index.png)

La página de detalle de un componente, con sus props y slots:

![La página de detalle de un componente](./screenshot-detail.png)

## Lado a lado

::::tabs
:::tab[Constructor]
![El constructor, componiendo un componente en vivo](./screenshot-builder.png)
:::
:::tab[Insights]
![Insights: uso y dependencias en todo el proyecto](./screenshot-insights.png)
:::
::::

## Plegado

:::tip[Ábreme]{collapsed}
Este admonition empieza cerrado. Por debajo es un `<details>`, así que funciona sin JavaScript.
:::

## Diagrama

Un bloque con el lenguaje `mermaid` se dibuja como un SVG que sigue la paleta y el tema del sitio. Lleva la etiqueta `mermaid` y un botón para copiar el código, como cualquier bloque de código, y otro para verlo a pantalla completa: allí se acerca, se aleja y se mueve. La librería solo carga Mermaid en las páginas que tienen un diagrama.

```mermaid
flowchart LR
  accTitle: Del Markdown a la página
  md[Markdown] --> plugin{{Plugin de Mermaid}}
  plugin --> source[Código legible]
  source -->|JavaScript| svg[Diagrama SVG]
  source -->|Sin JavaScript| code[Se queda como código]
```
