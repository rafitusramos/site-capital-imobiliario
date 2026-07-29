import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      // Mesmo alias do tsconfig.json — os módulos importam "@/lib/...".
      "@": raiz,
      // O pacote `server-only` lança ao ser importado fora de um React Server
      // Component. Os módulos sob teste o importam só como guarda de build;
      // aqui ele vira um módulo vazio.
      "server-only": fileURLToPath(new URL("./tests/apoio/server-only.ts", import.meta.url)),
    },
  },
});
