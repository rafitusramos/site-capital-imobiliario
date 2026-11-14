import { expect, test } from "@playwright/test";
import { canonicalDaPagina } from "./apoio/pagina";

/*
 * SOMENTE LEITURA. Abre formulários e páginas, confere texto e status HTTP.
 * Nunca envia formulário nem usa segredos nas rotas /api/meta/*.
 */
const CONSENTIMENTO =
  "Autorizo o uso dos meus dados para a pré-qualificação de crédito e o encaminhamento às instituições financeiras parceiras, e aceito receber o atendimento da RT Capital Imobiliário pelo WhatsApp.";

test.describe("WhatsApp: texto de consentimento nos formulários (sem enviar)", () => {
  for (const rota of ["/financiamento/", "/home_equity/"]) {
    test(`${rota} mostra o novo texto de consentimento`, async ({ page }) => {
      await page.goto(rota);
      await expect(page.locator(".consentimento").first()).toContainText(CONSENTIMENTO);
    });
  }

  test("modal de imóvel (aberto por [data-abrir-lead]) mostra o novo texto", async ({ page }) => {
    await page.goto("/imoveis/");
    const href = await page.locator('a[href^="/imoveis/"][href$="/"]').evaluateAll((as) =>
      (as as HTMLAnchorElement[]).map((a) => a.getAttribute("href")!).find((h) => /^\/imoveis\/[^/]+\/$/.test(h)),
    );
    expect(href, "link de imóvel na listagem").toBeTruthy();
    await page.goto(href!);
    await page.locator("[data-abrir-lead]").first().click();
    await expect(page.locator("#leadImovelTitulo, [aria-labelledby=leadImovelTitulo]").first()).toBeVisible();
    await expect(page.locator("[aria-labelledby=leadImovelTitulo]")).toContainText(CONSENTIMENTO);
  });
});

test.describe("WhatsApp: política de privacidade", () => {
  test("seção 14 'Conversas no WhatsApp' com 2 parágrafos e referência à seção 7", async ({ page }) => {
    await page.goto("/politica-de-privacidade/");
    const secao = page.locator("#conversas-no-whatsapp");
    await expect(secao.getByRole("heading", { level: 2 })).toHaveText(/14\.\s*Conversas no WhatsApp/);
    await expect(secao.locator("p")).toHaveCount(2);
    await expect(secao).toContainText("seção 7");
  });

  test("Meta citada nas seções 5 e 6 e índice leva a #conversas-no-whatsapp", async ({ page }) => {
    await page.goto("/politica-de-privacidade/");
    await expect(page.locator("#com-quem-compartilhamos")).toContainText("Meta Platforms");
    await expect(page.locator("#transferencia-internacional")).toContainText("Meta");
    await expect(page.locator('a[href="#conversas-no-whatsapp"]')).toHaveCount(1);
    expect(await canonicalDaPagina(page)).toMatch(/\/politica-de-privacidade\/$/);
    await expect(page).toHaveTitle(/Privacidade/i);
  });
});

test.describe("WhatsApp: rotas Meta sem segredos no preview", () => {
  test("GET /api/meta/webhook/ e POST /api/meta/disparar/ respondem 503 (produção: 403/401)", async ({ request, baseURL }) => {
    const producao = /(^|\/\/)(www\.)?rtcapitalimobiliario\.com\.br/.test(baseURL ?? "");
    const w = await request.get("/api/meta/webhook/?hub.mode=subscribe&hub.verify_token=x&hub.challenge=abc");
    expect(w.status()).toBe(producao ? 403 : 503);
    expect(await w.text()).not.toContain("abc");
    const d = await request.post("/api/meta/disparar/", { headers: { authorization: "Bearer errado" } });
    expect(d.status()).toBe(producao ? 401 : 503);
  });
});
