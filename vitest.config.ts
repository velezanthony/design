/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/* Por la config de Vite de Astro, para que los alias y la compilación de `.astro` se resuelvan
   en los tests exactamente igual que en la build. */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
