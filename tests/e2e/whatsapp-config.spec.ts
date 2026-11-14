import { abrirAdmin, ESTADO_ADMIN, expect, test } from "./apoio/admin";
import { coletarErros } from "./apoio/pagina";

/*
 * SOMENTE LEITURA. Todo deploy usa o MESMO banco de produção: esta suíte só abre
 * /admin/whatsapp/ e confere o que está na tela. Nunca clica em "Salvar" nem em
 * "Assinar webhooks". Sem usuário de QA (.env.e2e.local) a fixture pula os testes.
 */
test.describe("WhatsApp: página de configuração (somente leitura)", () => {
  test.use({ storageState: ESTADO_ADMIN });

  test("sidebar mostra a entrada WhatsApp", async ({ page }) => {
    await abrirAdmin(page, "/admin/whatsapp/");
    await expect(page.getByRole("link", { name: "WhatsApp", exact: true }).first()).toBeVisible();
  });

  test("/admin/whatsapp/ carrega com título, número oficial e envios, sem erro", async ({ page, baseURL, acoesServidor }) => {
    const erros = coletarErros(page, baseURL!);
    await abrirAdmin(page, "/admin/whatsapp/");
    await expect(page.getByRole("heading", { name: "WhatsApp", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Número oficial")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Últimos envios" })).toBeVisible();
    await expect(page.getByText(/Application error|Internal Server Error|Algo deu errado/i)).toHaveCount(0);
    expect(erros.proprios, "erros de console próprios").toEqual([]);
    // Não clica em salvar nem em assinar: nenhuma Server Action pode ter sido disparada.
    expect(acoesServidor).toEqual([]);
  });
});
