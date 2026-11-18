/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/* Por la config de Vite de Astro, para que los alias y la compilación de `.astro` se resuelvan
   en los tests exactamente igual que en la build. */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Con `include`, lo que ningún test importa sale al 0 % en vez de no salir.
      include: ['src/**/*.{ts,astro}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'src/testing/**', '**/fixtures/**', 'src/pages/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
