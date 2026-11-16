/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/* Por la config de Vite de Astro, para que los alias y la compilación de `.astro` se resuelvan
   en los tests exactamente igual que en la build. */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    /* Aún sin tests de módulos; una suite vacía no es un fallo. Se quita al llegar el primero. */
    passWithNoTests: true,
  },
});
