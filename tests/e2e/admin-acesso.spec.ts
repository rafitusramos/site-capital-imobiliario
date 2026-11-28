import { abrirAdmin, abrirModalDoLead, ESTADO_ADMIN, expect, test } from "./apoio/admin";

/*
 * SOMENTE LEITURA (PR #111, acesso do CRM só para membros). Só navega, abre o
 * modal e fecha. A migration 039 NÃO é exercitada aqui: o preview fala com o
 * banco de produção sem ela. "Usuário sem perfil" não é testável ponta a ponta
 * (não se cria conta); fica coberto por tests/unidade/middleware-sessao.test.ts
 * e tests/acoes/*.
 */
const TEXTO_NEGADO = /Sua conta não tem acesso ao painel/;

test.describe("anônimo", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/admin/crm/ redireciona para /admin/login/", async ({ page }) => {
    await page.goto("/admin/crm/");
    await expect(page).toHaveURL(/\/admin\/login\//);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("/admin/login/?acesso=negado mostra o alerta", async ({ page }) => {
    await page.goto("/admin/login/?acesso=negado");
    await expect(page.getByRole("alert").filter({ hasText: TEXTO_NEGADO })).toBeVisible();
  });

  test("/admin/login/ simples não mostra alerta", async ({ page }) => {
    await page.goto("/admin/login/");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText(TEXTO_NEGADO)).toHaveCount(0);
  });
});

test.describe("QA admin logado", () => {
  test.use({ storageState: ESTADO_ADMIN });

  test("/admin/login/ redireciona para a home do admin sem laço", async ({ page }) => {
    await page.goto("/admin/login/");
    await expect(page).toHaveURL(/\/admin\/(?!login)/);
    await expect(page.getByRole("button", { name: "Entrar" })).toHaveCount(0);
  });

  test("/admin/crm/ carrega quadro, contagens e modal do lead", async ({ page }) => {
    await abrirAdmin(page, "/admin/crm/");
    const abas = page.getByRole("navigation", { name: "Origem dos leads" });
    await expect(abas).toBeVisible();
    for (const aba of await abas.getByRole("link").all()) {
      await expect(aba).toHaveText(/\d+/);
    }
    const editar = page.getByRole("button", { name: "Editar lead" });
    await expect(page.getByRole("button", { name: /^Lead .+, protocolo / }).first()).toBeVisible();
    test.skip((await editar.count()) === 0, "nenhum lead na aba padrão");
    const modal = await abrirModalDoLead(page, editar.first());
    await expect(modal.getByRole("alert")).toHaveCount(0);
    await modal.getByRole("button", { name: "Fechar" }).click();
    await expect(modal).toBeHidden();
  });
});
