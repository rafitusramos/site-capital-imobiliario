import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

/**
 * Suíte funcional (E2E) — roda contra uma URL de deploy da Vercel.
 *
 * ATENÇÃO: todo deploy (branch, Preview, produção) usa o MESMO banco de
 * produção. Por isso a suíte é somente leitura; a política completa está em
 * tests/functional-tests/README.md.
 */

// Parser mínimo de .env (sem dependência nova): KEY=valor, # comentários.
// Variável já definida no ambiente tem prioridade sobre o arquivo.
function carregarEnvLocal(arquivo: string) {
  if (!existsSync(arquivo)) return;
  for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(linha);
    if (!m || m[1].startsWith("#")) continue;
    const valor = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined && valor !== "") process.env[m[1]] = valor;
  }
}
carregarEnvLocal(".env.e2e.local");

const urlBruta = process.env.E2E_BASE_URL?.trim();
if (!urlBruta) {
  throw new Error(
    "E2E_BASE_URL não definida. Informe a URL do deploy a testar, por exemplo:\n" +
      "  E2E_BASE_URL=https://meu-deploy.vercel.app npm run e2e\n" +
      "ou preencha .env.e2e.local (modelo: .env.e2e.local.example).",
  );
}
// Sem barra final: os specs usam caminhos absolutos ("/imoveis/"), e
// "https://host/" + "/imoveis/" não pode virar "//imoveis/".
const baseURL = urlBruta.replace(/\/+$/, "");

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.(spec|setup)\.ts/,
  outputDir: "tests/functional-tests/.artefatos",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/functional-tests/.ultimo-html", open: "never" }],
    ["json", { outputFile: "tests/functional-tests/.ultimo-resultado.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      // Todos os specs; os de admin carregam o estado de login via test.use.
      name: "desktop",
      testMatch: /.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      // Só o site público.
      name: "mobile",
      testMatch: /.*\.spec\.ts/,
      testIgnore: /admin-.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});
