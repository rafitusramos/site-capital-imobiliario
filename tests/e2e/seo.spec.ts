import { expect, test, type Page } from "@playwright/test";
import { canonicalDaPagina, coletarErros, metaContent } from "./apoio/pagina";

const PAGINAS_FIXAS = ["/", "/financiamento/", "/home_equity/", "/blog/", "/imoveis/", "/sobre/"];

async function primeiroArtigo(page: Page): Promise<string> {
  await page.goto("/blog/");
  const hrefs = await page
    .locator('a[href^="/blog/"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
  const artigo = hrefs.find((h) => /^\/blog\/[^/?#]+\/$/.test(h));
  test.skip(!artigo, "nenhum artigo publicado");
  return artigo!;
}

async function verificarPagina(page: Page, caminho: string, baseURL: string) {
  const erros = coletarErros(page, baseURL);
  const resposta = await page.goto(caminho);
  expect(resposta?.status(), `status de ${caminho}`).toBe(200);
  await page.waitForLoadState("load");

  await expect(page).toHaveTitle(/\S/);
  expect(await metaContent(page, 'meta[name="description"]'), "meta description").not.toBe("");
  const canonical = await canonicalDaPagina(page);
  expect(canonical, "canonical presente").not.toBe("");
  expect(canonical, "canonical termina em /").toMatch(/\/$/);

  if (erros.terceiros.length > 0) {
    test.info().annotations.push({ type: "ruído de terceiros", description: erros.terceiros.join("\n") });
  }
  expect(erros.proprios, "erros de console/página do próprio site").toEqual([]);
}

test.describe("SEO e saúde das páginas públicas", () => {
  for (const caminho of PAGINAS_FIXAS) {
    test(`${caminho}: 200, title, description, canonical e console limpo`, async ({ page, baseURL }) => {
      await verificarPagina(page, caminho, baseURL!);
    });
  }

  test("artigo do blog: 200, title, description, canonical e console limpo", async ({ page, baseURL }) => {
    const artigo = await primeiroArtigo(page);
    await verificarPagina(page, artigo, baseURL!);
  });

  test("/sitemap.xml lista imagens (<image:image>)", async ({ request }) => {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    expect(await resposta.text()).toContain("<image:image>");
  });
});
