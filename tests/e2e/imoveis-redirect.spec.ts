import { expect, test } from "@playwright/test";
import { ListagemImoveisPage } from "./paginas/listagem-imoveis.page";

const SLUG_INEXISTENTE = "/imoveis/imovel-removido-qa-inexistente/";

test.describe("/imoveis/<slug>/ de imóvel removido", () => {
  test("responde redirect permanente para /imoveis/", async ({ request }) => {
    const resposta = await request.get(SLUG_INEXISTENTE, { maxRedirects: 0 });
    expect([301, 308], "redirect permanente, nunca 404").toContain(resposta.status());
    expect(resposta.headers()["location"]).toMatch(/\/imoveis\/$/);
  });

  test("a navegação termina na listagem com o h1 visível", async ({ page }) => {
    await page.goto(SLUG_INEXISTENTE);
    await expect(page).toHaveURL(/\/imoveis\/$/);
    await expect(new ListagemImoveisPage(page).titulo).toBeVisible();
  });
});
