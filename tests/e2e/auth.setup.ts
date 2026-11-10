import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";
import { ESTADO_ADMIN } from "./apoio/admin";

/**
 * Login do usuário de QA (somente leitura depois disso — ver README da suíte).
 * Sem E2E_EMAIL/E2E_SENHA grava um estado vazio e os specs de admin se pulam.
 * Nunca registra e-mail nem senha.
 */
setup("autenticar usuário de QA", async ({ page }) => {
  mkdirSync(dirname(ESTADO_ADMIN), { recursive: true });
  const email = process.env.E2E_EMAIL;
  const senha = process.env.E2E_SENHA;

  if (!email || !senha) {
    writeFileSync(ESTADO_ADMIN, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip(true, "sem usuário de QA (.env.e2e.local)");
    return;
  }

  await page.goto("/admin/login/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  try {
    // 20 s: o login em produção/preview a frio passa de 5 s (o padrão); com o tempo curto a suíte
    // gravava estado vazio e pulava os specs de admin.
    await expect(page).toHaveURL(/\/admin\/(?!login)/, { timeout: 20_000 });
  } catch {
    // Login recusado: não derruba a suíte pública (dependência de projeto).
    // Os specs de admin se pulam com o motivo em abrirAdmin().
    writeFileSync(ESTADO_ADMIN, JSON.stringify({ cookies: [], origins: [] }));
    setup.info().annotations.push({ type: "aviso", description: "login do usuário de QA não concluiu" });
    return;
  }
  await page.context().storageState({ path: ESTADO_ADMIN });
});
