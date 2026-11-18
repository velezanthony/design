// @ts-check

/** @type {import('prettier').Config} */
export default {
  /* El plugin de Tailwind tiene que cargarse el último: envuelve a los demás parsers. */
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  /* El ancho al que se ajustan a mano los comentarios. */
  printWidth: 100,
  singleQuote: true,
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],

  /* La hoja que define `@theme` y las utilidades propias, para que se ordenen como las de Tailwind. */
  tailwindStylesheet: './src/components/styles/theme.css',
};
