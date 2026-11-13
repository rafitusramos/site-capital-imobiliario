import { test, expect } from "@playwright/test";

// Somente leitura: só GET de /blog/ e dos artigos.
// Tabela larga dentro do artigo não pode alargar a página no celular: ela rola
// dentro de `.tabela-rolagem` (components/blog/markdown.tsx).

test.describe("tabelas dos artigos em 360px", () => {
  // Percorre vários artigos; com 6 workers no deploy de preview passava dos 30 s.
  test.describe.configure({ timeout: 60_000 });

  test.use({ viewport: { width: 360, height: 740 } });

  test("nenhum artigo tem rolagem horizontal de página; tabelas rolam no invólucro", async ({ page }) => {
    await page.goto("/blog/");
    const slugs = await page.$$eval('a[href^="/blog/"]', (as) =>
      [...new Set(as.map((a) => a.getAttribute("href") ?? ""))].filter((h) => /^\/blog\/[^/]+\/$/.test(h)),
    );
    expect(slugs.length).toBeGreaterThan(0);

    let comTabela = 0;
    for (const slug of slugs) {
      await page.goto(slug);
      const r = await page.evaluate(() => {
        const tabelas = [...document.querySelectorAll(".artigo-texto table")];
        return {
          largura: document.documentElement.scrollWidth,
          tabelas: tabelas.length,
          todasEnvolvidas: tabelas.every((t) => {
            const pai = t.parentElement;
            return (
              pai?.classList.contains("tabela-rolagem") &&
              pai.getAttribute("role") === "region" &&
              pai.getAttribute("tabindex") === "0"
            );
          }),
        };
      });
      expect(r.largura, `${slug}: scrollWidth`).toBeLessThanOrEqual(360);
      expect(r.todasEnvolvidas, `${slug}: tabela fora do invólucro`).toBe(true);
      if (r.tabelas > 0) comTabela++;
    }
    expect(comTabela, "nenhum artigo com tabela foi exercitado").toBeGreaterThan(0);
  });
});
