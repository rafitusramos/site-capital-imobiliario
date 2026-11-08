import { expect, test } from "@playwright/test";
import { LandingPage, SimuladorFinanciamento } from "./paginas/landing.page";
import { lerJsonLd, tiposJsonLd } from "./apoio/pagina";

// Nenhum formulário é enviado aqui: enviar cria lead real e dispara e-mail.

for (const caminho of ["/financiamento/", "/home_equity/"]) {
  test.describe(`${caminho} — landing`, () => {
    test("FAQ tem 9 perguntas e cada uma abre e fecha", async ({ page }) => {
      const landing = new LandingPage(page, caminho);
      await landing.goto();

      await expect(landing.faqs).toHaveCount(9);
      for (let i = 0; i < 9; i++) {
        const item = landing.faqs.nth(i);
        await item.scrollIntoViewIfNeeded();
        await item.locator("summary").click();
        await expect(item, `pergunta ${i + 1} abre`).toHaveJSProperty("open", true);
        await item.locator("summary").click();
        await expect(item, `pergunta ${i + 1} fecha`).toHaveJSProperty("open", false);
      }
    });

    test("JSON-LD tem Service, BreadcrumbList e FAQPage", async ({ page }) => {
      await new LandingPage(page, caminho).goto();
      const tipos = tiposJsonLd(await lerJsonLd(page));
      for (const tipo of ["Service", "BreadcrumbList", "FAQPage"]) {
        expect(tipos, `JSON-LD ${tipo}`).toContain(tipo);
      }
    });

    test('bloco "Leia também" tem 3 artigos do blog', async ({ page }) => {
      const landing = new LandingPage(page, caminho);
      await landing.goto();
      expect(await landing.artigosLeiaTambem()).toHaveLength(3);
    });
  });
}

test.describe("/financiamento/ — simulador", () => {
  test("alternar de SAC para PRICE muda o texto da parcela", async ({ page }) => {
    await new LandingPage(page, "/financiamento/").goto();
    const simulador = new SimuladorFinanciamento(page);

    await simulador.parcela.scrollIntoViewIfNeeded();
    await expect(simulador.sac).toHaveAttribute("aria-checked", "true");
    const antes = (await simulador.parcela.textContent()) ?? "";
    expect(antes).toMatch(/R\$/);

    await simulador.escolher(simulador.price);
    await expect(simulador.parcela).not.toHaveText(antes);
    await expect(page.getByText("Parcela fixa aproximada")).toBeVisible();
  });
});
