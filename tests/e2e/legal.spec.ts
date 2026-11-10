import { expect, test } from "@playwright/test";
import { canonicalDaPagina } from "./apoio/pagina";

// Somente leitura: só navega e lê o HTML/XML servido.
test.describe("Páginas legais", () => {
  test("política: item 2a cita data de nascimento e o motivo (seguro habitacional)", async ({ page }) => {
    const resposta = await page.goto("/politica-de-privacidade/");
    expect(resposta?.status()).toBe(200);
    const secao = page.locator("#quais-dados-coletamos");
    await expect(secao).toContainText("data de nascimento");
    await expect(secao).toContainText("seguro");
    await expect(secao).toContainText("habitacional");
  });

  test("política: topo mostra 'Atualizado em 9 de novembro de 2026'", async ({ page }) => {
    await page.goto("/politica-de-privacidade/");
    await expect(page.locator(".legal-atualizado")).toHaveText("Atualizado em 9 de novembro de 2026");
  });

  test("política: canonical segue /politica-de-privacidade/", async ({ page }) => {
    await page.goto("/politica-de-privacidade/");
    expect(await canonicalDaPagina(page)).toMatch(/\/politica-de-privacidade\/$/);
  });

  test("termos: continua 'Atualizado em 30 de julho de 2026'", async ({ page }) => {
    await page.goto("/termos-de-uso/");
    await expect(page.locator(".legal-atualizado")).toHaveText("Atualizado em 30 de julho de 2026");
  });

  test("sitemap: lastmod da política começa com 2026-11-09", async ({ request }) => {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    const xml = await resposta.text();
    const bloco = xml.split("<url>").find((b) => /<loc>[^<]*\/politica-de-privacidade\/<\/loc>/.test(b));
    expect(bloco, "entrada da política no sitemap").toBeDefined();
    expect(bloco!).toMatch(/<lastmod>2026-11-09/);
  });
});
